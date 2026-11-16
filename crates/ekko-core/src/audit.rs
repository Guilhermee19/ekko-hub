//! Audit trail of PC-control actions: one JSON object per line (`audit.log.jsonl`), so
//! appending is cheap and a broken line never loses the rest.

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// Above this size the oldest half is dropped on the next append.
const MAX_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AuditRisk {
    Safe,
    Confirm,
    Dangerous,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AuditResult {
    Ok,
    Denied,
    Error,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub at_ms: u64,
    /// Tool id ("system.kill").
    pub tool: String,
    pub detail: String,
    pub risk: AuditRisk,
    pub result: AuditResult,
    /// "ui" for now; later "voice", "text", "routine".
    pub origin: String,
}

pub struct AuditLog {
    path: PathBuf,
    lock: Mutex<()>,
}

impl AuditLog {
    pub fn new(dir: &Path) -> Self {
        Self {
            path: dir.join("audit.log.jsonl"),
            lock: Mutex::new(()),
        }
    }

    pub fn append(&self, entry: &AuditEntry) -> std::io::Result<()> {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir)?;
        }
        if fs::metadata(&self.path).is_ok_and(|m| m.len() > MAX_BYTES) {
            let text = fs::read_to_string(&self.path).unwrap_or_default();
            let lines: Vec<&str> = text.lines().collect();
            let keep = lines[lines.len() / 2..].join("\n");
            fs::write(&self.path, format!("{keep}\n"))?;
        }
        let line = serde_json::to_string(entry).map_err(std::io::Error::other)?;
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)?;
        writeln!(file, "{line}")
    }

    /// Newest first; unreadable lines are skipped.
    pub fn recent(&self, limit: usize) -> Vec<AuditEntry> {
        let _guard = self.lock.lock().unwrap_or_else(|e| e.into_inner());
        let text = fs::read_to_string(&self.path).unwrap_or_default();
        parse_recent(&text, limit)
    }
}

pub fn parse_recent(text: &str, limit: usize) -> Vec<AuditEntry> {
    text.lines()
        .rev()
        .filter_map(|l| serde_json::from_str(l).ok())
        .take(limit)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(at_ms: u64) -> AuditEntry {
        AuditEntry {
            at_ms,
            tool: "system.kill".into(),
            detail: "notepad.exe".into(),
            risk: AuditRisk::Confirm,
            result: AuditResult::Ok,
            origin: "ui".into(),
        }
    }

    #[test]
    fn appends_and_reads_newest_first() {
        let dir = std::env::temp_dir().join(format!("ekko-audit-{}", std::process::id()));
        let log = AuditLog::new(&dir);
        for i in 1..=3 {
            log.append(&entry(i)).unwrap();
        }
        let recent = log.recent(2);
        assert_eq!(recent.iter().map(|e| e.at_ms).collect::<Vec<_>>(), [3, 2]);
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn broken_lines_are_skipped() {
        let good = serde_json::to_string(&entry(7)).unwrap();
        let parsed = parse_recent(&format!("{good}\n{{oops\n"), 10);
        assert_eq!(parsed, vec![entry(7)]);
    }
}
