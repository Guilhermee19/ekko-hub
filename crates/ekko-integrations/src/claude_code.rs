//! Finds the Claude Code CLI on this machine and reads its version.
//! Blocking (spawns a process): call from `spawn_blocking`.

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde::Serialize;

/// Preferred order: the native installer's exe, then the npm shim. Never the bare
/// sh script or the .ps1 npm also drops next to them.
const NAMES: &[&str] = &["claude.exe", "claude.cmd"];
const VERSION_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeCodeStatus {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

/// PATH entries first, then the usual install dirs (which a GUI app's PATH may miss).
pub fn search_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).collect())
        .unwrap_or_default();
    let env = |key: &str| std::env::var_os(key).map(PathBuf::from);
    if let Some(home) = env("USERPROFILE") {
        dirs.push(home.join(".local").join("bin"));
        dirs.push(home.join(".claude").join("local"));
    }
    if let Some(appdata) = env("APPDATA") {
        dirs.push(appdata.join("npm"));
    }
    if let Some(local) = env("LOCALAPPDATA") {
        dirs.push(local.join("Programs").join("claude"));
    }
    dirs
}

/// First `claude.exe` / `claude.cmd` found, scanning each dir for every name in order.
pub fn find_in(dirs: &[PathBuf]) -> Option<PathBuf> {
    NAMES.iter().find_map(|name| {
        dirs.iter()
            .map(|dir| dir.join(name))
            .find(|candidate| candidate.is_file())
    })
}

pub fn detect() -> ClaudeCodeStatus {
    let Some(path) = find_in(&search_dirs()) else {
        return ClaudeCodeStatus {
            found: false,
            path: None,
            version: None,
        };
    };
    ClaudeCodeStatus {
        found: true,
        version: version(&path),
        path: Some(path.display().to_string()),
    }
}

/// `claude --version` → "2.1.3 (Claude Code)"; `None` if it fails or hangs.
fn version(path: &Path) -> Option<String> {
    let mut cmd = Command::new(path);
    cmd.arg("--version")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let mut child = cmd.spawn().ok()?;
    let started = Instant::now();
    // The output is one short line, so the pipe never fills while we poll.
    loop {
        match child.try_wait().ok()? {
            Some(_) => break,
            None if started.elapsed() > VERSION_TIMEOUT => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    }
    let out = child.wait_with_output().ok()?;
    parse_version(&String::from_utf8_lossy(&out.stdout))
}

fn parse_version(stdout: &str) -> Option<String> {
    stdout
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .map(str::to_owned)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("ekko-cc-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn prefers_exe_over_npm_shim_and_ignores_others() {
        let npm = temp_dir("npm");
        let native = temp_dir("native");
        std::fs::write(npm.join("claude"), "").unwrap();
        std::fs::write(npm.join("claude.ps1"), "").unwrap();
        let dirs = [npm.clone(), native.clone()];
        assert_eq!(find_in(&dirs), None);
        std::fs::write(npm.join("claude.cmd"), "").unwrap();
        assert_eq!(find_in(&dirs), Some(npm.join("claude.cmd")));
        std::fs::write(native.join("claude.exe"), "").unwrap();
        assert_eq!(find_in(&dirs), Some(native.join("claude.exe")));
        let _ = std::fs::remove_dir_all(npm);
        let _ = std::fs::remove_dir_all(native);
    }

    #[test]
    fn version_is_the_first_non_empty_line() {
        assert_eq!(
            parse_version("\n 2.1.3 (Claude Code)\r\n").as_deref(),
            Some("2.1.3 (Claude Code)")
        );
        assert_eq!(parse_version("  \n"), None);
    }
}
