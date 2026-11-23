//! Temp files and the recycle bin: measuring (for the scan) and the two cleanups.
//! Safety rules: only files inside the user's own %TEMP%, older than the cutoff, never
//! following links/junctions out of it; in-use files are skipped. The recycle bin is
//! emptied only through the Windows API.

use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use serde::Serialize;

/// Walk limits so a pathological %TEMP% cannot hang the scan.
const MAX_DEPTH: usize = 24;
const MAX_ENTRIES: usize = 400_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirUsage {
    pub bytes: u64,
    pub files: u64,
    /// Files older than the cutoff (what `clean_temp` would try to delete).
    pub old_bytes: u64,
    pub old_files: u64,
    /// False when the folder itself could not be opened (permissions).
    pub readable: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanReport {
    pub freed_bytes: u64,
    pub deleted_files: u64,
    /// In use, read-only or vanished meanwhile.
    pub skipped_files: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecycleBin {
    pub bytes: u64,
    pub items: u64,
}

#[derive(Debug, thiserror::Error)]
pub enum CleanError {
    #[error("a pasta temporária ({0}) não parece ser a do usuário; nada foi apagado")]
    UnsafeTemp(String),
    #[error("{0}")]
    Os(String),
}

/// True when `temp` is inside `<local_appdata>\Temp` (case-insensitive, by component).
/// Splits on both `\` and `/` so the check behaves the same on every host OS.
pub fn is_safe_temp_root(temp: &Path, local_appdata: &Path) -> bool {
    let parts = |p: &Path| -> Vec<String> {
        p.to_string_lossy()
            .split(['\\', '/'])
            .filter(|s| !s.is_empty())
            .map(str::to_lowercase)
            .collect()
    };
    let base = parts(local_appdata)
        .into_iter()
        .chain(["temp".into()])
        .collect::<Vec<_>>();
    let temp = parts(temp);
    base.len() > 2 && temp.len() >= base.len() && temp[..base.len()] == base[..]
}

pub fn is_older(modified: Option<SystemTime>, cutoff: SystemTime) -> bool {
    modified.is_some_and(|m| m < cutoff)
}

/// The user's %TEMP%, validated by `is_safe_temp_root`.
pub fn user_temp() -> Result<PathBuf, CleanError> {
    let temp = std::env::temp_dir();
    let local = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    let canon = |p: &Path| std::fs::canonicalize(p).unwrap_or_else(|_| p.to_path_buf());
    match local {
        Some(local) if is_safe_temp_root(&canon(&temp), &canon(&local)) => Ok(canon(&temp)),
        _ => Err(CleanError::UnsafeTemp(temp.display().to_string())),
    }
}

pub fn cutoff(older_than_hours: u64) -> SystemTime {
    SystemTime::now() - Duration::from_secs(older_than_hours.saturating_mul(3600))
}

struct Entry {
    path: PathBuf,
    is_dir: bool,
    len: u64,
    modified: Option<SystemTime>,
}

/// Every file and folder under `root` (root excluded), parents before children.
/// Links and junctions are listed as nothing and never entered.
fn walk(root: &Path) -> Option<Vec<Entry>> {
    let mut out = Vec::new();
    let mut stack = vec![(root.to_path_buf(), 0usize)];
    let mut first = true;
    while let Some((dir, depth)) = stack.pop() {
        let read = std::fs::read_dir(&dir);
        if first && read.is_err() {
            return None;
        }
        first = false;
        for entry in read.into_iter().flatten().flatten() {
            if out.len() >= MAX_ENTRIES {
                return Some(out);
            }
            let Ok(meta) = entry.metadata() else { continue };
            if is_link(&meta) {
                continue;
            }
            let is_dir = meta.is_dir();
            if is_dir && depth < MAX_DEPTH {
                stack.push((entry.path(), depth + 1));
            }
            out.push(Entry {
                path: entry.path(),
                is_dir,
                len: if is_dir { 0 } else { meta.len() },
                modified: meta.modified().ok(),
            });
        }
    }
    Some(out)
}

fn is_link(meta: &std::fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
        meta.file_type().is_symlink() || meta.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT != 0
    }
    #[cfg(not(windows))]
    {
        meta.file_type().is_symlink()
    }
}

/// Size of a folder (best effort: unreadable subfolders are skipped).
pub fn dir_usage(root: &Path, cutoff: SystemTime) -> DirUsage {
    let Some(entries) = walk(root) else {
        return DirUsage::default();
    };
    let mut usage = DirUsage {
        readable: true,
        ..DirUsage::default()
    };
    for e in entries.iter().filter(|e| !e.is_dir) {
        usage.bytes += e.len;
        usage.files += 1;
        if is_older(e.modified, cutoff) {
            usage.old_bytes += e.len;
            usage.old_files += 1;
        }
    }
    usage
}

/// Deletes files older than `older_than_hours` from the user's %TEMP% only.
pub fn clean_temp(older_than_hours: u64) -> Result<CleanReport, CleanError> {
    let root = user_temp()?;
    let cutoff = cutoff(older_than_hours);
    let entries = walk(&root)
        .ok_or_else(|| CleanError::Os("não consegui abrir a pasta temporária".into()))?;
    let mut report = CleanReport {
        freed_bytes: 0,
        deleted_files: 0,
        skipped_files: 0,
    };
    for e in entries
        .iter()
        .filter(|e| !e.is_dir && is_older(e.modified, cutoff))
    {
        // A file in use (or read-only) fails here and is simply kept.
        if e.path.starts_with(&root) && std::fs::remove_file(&e.path).is_ok() {
            report.freed_bytes += e.len;
            report.deleted_files += 1;
        } else {
            report.skipped_files += 1;
        }
    }
    // Children before parents; `remove_dir` only succeeds on empty folders.
    for e in entries
        .iter()
        .rev()
        .filter(|e| e.is_dir && is_older(e.modified, cutoff))
    {
        if e.path.starts_with(&root) && e.path != root {
            let _ = std::fs::remove_dir(&e.path);
        }
    }
    Ok(report)
}

/// All drives' recycle bins together; None if Windows does not answer.
pub fn recycle_bin() -> Option<RecycleBin> {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{SHQUERYRBINFO, SHQueryRecycleBinW};
        use windows::core::PCWSTR;
        let mut info = SHQUERYRBINFO {
            cbSize: size_of::<SHQUERYRBINFO>() as u32,
            ..Default::default()
        };
        // SAFETY: valid struct with cbSize set; null root = every drive.
        unsafe { SHQueryRecycleBinW(PCWSTR::null(), &mut info) }.ok()?;
        Some(RecycleBin {
            bytes: info.i64Size.max(0) as u64,
            items: info.i64NumItems.max(0) as u64,
        })
    }
    #[cfg(not(windows))]
    {
        None
    }
}

/// Empties every recycle bin (no Windows prompt, progress or sound: Ekko already asked).
/// Returns the bytes freed.
pub fn empty_recycle_bin() -> Result<u64, CleanError> {
    let before = recycle_bin().unwrap_or(RecycleBin { bytes: 0, items: 0 });
    if before.items == 0 {
        return Ok(0);
    }
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{
            SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI, SHERB_NOSOUND, SHEmptyRecycleBinW,
        };
        use windows::core::PCWSTR;
        let flags = SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND;
        // SAFETY: null root = every drive; no window handle needed without UI.
        unsafe { SHEmptyRecycleBinW(None, PCWSTR::null(), flags) }
            .map_err(|e| CleanError::Os(e.message()))?;
        let after = recycle_bin().map_or(0, |b| b.bytes);
        Ok(before.bytes.saturating_sub(after))
    }
    #[cfg(not(windows))]
    {
        Err(CleanError::Os("só no Windows".into()))
    }
}
