//! Which processes Ekko may end. Critical Windows processes are never touched (ending
//! them crashes or logs off the PC); shell helpers get a warning because Windows
//! restarts them and the taskbar/start menu flickers.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Protection {
    /// No "Finalizar tarefa" button at all.
    Protected,
    /// Allowed, behind a stronger confirmation.
    Warn,
    Ok,
}

/// Lowercase names (with ".exe" where Windows has one).
const PROTECTED: &[&str] = &[
    "system",
    "system idle process",
    "idle",
    "registry",
    "memory compression",
    "secure system",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "winlogon.exe",
    "services.exe",
    "lsass.exe",
    "lsaiso.exe",
    "svchost.exe",
    "dwm.exe",
    "fontdrvhost.exe",
    "sihost.exe",
    "audiodg.exe",
    "wudfhost.exe",
    "msmpeng.exe",
    "nissrv.exe",
    "mpdefendercoreservice.exe",
    "securityhealthservice.exe",
    "sgrmbroker.exe",
    "spoolsv.exe",
    "logonui.exe",
    "lockapp.exe",
    // Ekko itself (dev build and installed app).
    "ekko-desktop.exe",
    "ekko.exe",
];

const WARN: &[&str] = &[
    "explorer.exe",
    "searchhost.exe",
    "startmenuexperiencehost.exe",
    "shellexperiencehost.exe",
    "textinputhost.exe",
    "ctfmon.exe",
    "runtimebroker.exe",
    "taskhostw.exe",
    "dllhost.exe",
    "conhost.exe",
    "smartscreen.exe",
    "securityhealthsystray.exe",
    "applicationframehost.exe",
    "widgets.exe",
    // Shared by many apps, Ekko's own window included.
    "msedgewebview2.exe",
];

pub fn protection(name: &str) -> Protection {
    let lower = name.trim().to_ascii_lowercase();
    if PROTECTED.contains(&lower.as_str()) {
        Protection::Protected
    } else if WARN.contains(&lower.as_str()) {
        Protection::Warn
    } else {
        Protection::Ok
    }
}

/// Never offered either: kernel pseudo-processes (pid 0/4) and Ekko's own pid.
pub fn protected_pid(pid: u32) -> bool {
    pid == 0 || pid == 4 || pid == std::process::id()
}
