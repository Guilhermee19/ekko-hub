//! "Meu PC": telemetry reads, "Finalizar tarefa", "Verificar meu PC" and its cleanups.
//! The UI confirms every destructive call first; each one is written to the audit log.
//! Slow work (killing waits for windows to close, scans walk folders) runs on blocking
//! threads so IPC stays responsive.

use std::sync::atomic::Ordering;

use ekko_core::audit::{AuditEntry, AuditResult, AuditRisk};
use ekko_os::system::cleanup::{self, CleanReport};
use ekko_os::system::format::human_bytes;
use ekko_os::system::group::sort;
use ekko_os::system::kill::{self, KillError, KillReport};
use ekko_os::system::scan::{self, Check, TEMP_MIN_AGE_HOURS};
use ekko_os::system::startup;
use ekko_os::system::{HistoryPoint, ProcessGroup, Protection, Snapshot, SortBy, protection};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::services::system::{SCAN_PROGRESS, SystemService};

async fn blocking<T: Send + 'static>(
    job: impl FnOnce() -> T + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn system_snapshot(system: State<'_, SystemService>) -> Option<Snapshot> {
    system.latest()
}

#[tauri::command]
pub fn system_history(system: State<'_, SystemService>) -> Vec<HistoryPoint> {
    system.history()
}

#[tauri::command]
pub fn system_processes(
    system: State<'_, SystemService>,
    sort_by: Option<SortBy>,
) -> Vec<ProcessGroup> {
    let mut groups = system.processes();
    sort(&mut groups, sort_by.unwrap_or_default());
    groups
}

/// Ends a whole group (`name`, e.g. "chrome.exe") or one `pid`. Protected processes are
/// refused here too, whatever the UI sent.
#[tauri::command]
pub async fn system_kill(
    app: AppHandle,
    name: Option<String>,
    pid: Option<u32>,
) -> Result<KillReport, String> {
    let target = name
        .clone()
        .or_else(|| pid.map(|p| format!("pid {p}")))
        .unwrap_or_default();
    let result = blocking(move || match (name, pid) {
        (Some(name), _) => kill::kill_group(&name),
        (None, Some(pid)) => kill::kill_pid(pid),
        (None, None) => Err(KillError::NotFound),
    })
    .await?;
    let system = app.state::<SystemService>();
    system.refresh_soon();
    match &result {
        Ok(report) => {
            let risk = match protection(&report.name) {
                Protection::Warn => AuditRisk::Dangerous,
                _ => AuditRisk::Confirm,
            };
            let outcome = if report.failed > 0 && report.ended == 0 {
                AuditResult::Error
            } else {
                AuditResult::Ok
            };
            let detail = format!(
                "{target}: {} finalizado(s), {} falha(s)",
                report.ended, report.failed
            );
            system.audit("system.kill", detail, risk, outcome);
        }
        Err(err) => {
            let outcome = match err {
                KillError::Protected(_) => AuditResult::Denied,
                _ => AuditResult::Error,
            };
            system.audit(
                "system.kill",
                format!("{target}: {err}"),
                AuditRisk::Confirm,
                outcome,
            );
        }
    }
    result.map_err(|e| e.to_string())
}

/// Runs every check off the async runtime, emitting `SCAN_PROGRESS` per step.
#[tauri::command]
pub async fn system_scan(app: AppHandle) -> Result<Vec<Check>, String> {
    let system = app.state::<SystemService>();
    if system.scanning.swap(true, Ordering::SeqCst) {
        return Err("a verificação já está em andamento".into());
    }
    let emitter = app.clone();
    let checks = blocking(move || {
        scan::run(&mut |progress| {
            let _ = emitter.emit(SCAN_PROGRESS, progress);
        })
    })
    .await;
    system.scanning.store(false, Ordering::SeqCst);
    checks
}

/// Deletes files older than 24 h from the user's %TEMP% (in-use files are skipped).
#[tauri::command]
pub async fn system_clean_temp(app: AppHandle) -> Result<CleanReport, String> {
    let result = blocking(|| cleanup::clean_temp(TEMP_MIN_AGE_HOURS)).await?;
    let system = app.state::<SystemService>();
    match &result {
        Ok(r) => system.audit(
            "system.clean_temp",
            format!(
                "{} liberados, {} arquivos apagados, {} em uso",
                human_bytes(r.freed_bytes),
                r.deleted_files,
                r.skipped_files
            ),
            AuditRisk::Confirm,
            AuditResult::Ok,
        ),
        Err(err) => system.audit(
            "system.clean_temp",
            err.to_string(),
            AuditRisk::Confirm,
            AuditResult::Error,
        ),
    }
    result.map_err(|e| e.to_string())
}

/// Empties every recycle bin; returns the bytes freed.
#[tauri::command]
pub async fn system_empty_recycle_bin(app: AppHandle) -> Result<u64, String> {
    let result = blocking(cleanup::empty_recycle_bin).await?;
    let system = app.state::<SystemService>();
    match &result {
        Ok(freed) => system.audit(
            "system.empty_recycle_bin",
            format!("{} liberados", human_bytes(*freed)),
            AuditRisk::Dangerous,
            AuditResult::Ok,
        ),
        Err(err) => system.audit(
            "system.empty_recycle_bin",
            err.to_string(),
            AuditRisk::Dangerous,
            AuditResult::Error,
        ),
    }
    result.map_err(|e| e.to_string())
}

/// Windows' own "Aplicativos de inicialização" page (Ekko never edits startup entries).
#[tauri::command]
pub async fn system_open_startup_settings() -> Result<(), String> {
    startup::open_settings().map_err(|e| e.to_string())
}

/// Newest first, for Settings → Privacidade.
#[tauri::command]
pub fn audit_recent(system: State<'_, SystemService>, limit: Option<usize>) -> Vec<AuditEntry> {
    system.recent_audit(limit.unwrap_or(100).min(1000))
}
