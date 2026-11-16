//! "Meu PC" telemetry: one worker thread owns the sysinfo sampler (CPU and network are
//! deltas, so the same instance must keep ticking) and publishes snapshots, a short
//! history for sparklines and the grouped process list. Also holds the audit log.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use ekko_core::audit::{AuditEntry, AuditLog, AuditResult, AuditRisk};
use ekko_os::system::{History, HistoryPoint, Monitor, ProcessGroup, Snapshot};
use tauri::{AppHandle, Emitter, Manager};

/// `Snapshot` every tick.
pub const SYSTEM_CHANGED: &str = "ekko://system/changed";
/// `ProcessGroup[]` (memory order) every few ticks.
pub const PROCESSES_CHANGED: &str = "ekko://system/processes";
/// `ScanProgress` per step of "Verificar meu PC".
pub const SCAN_PROGRESS: &str = "ekko://system/scan";

const TICK: Duration = Duration::from_millis(1500);
/// Processes are re-read every N ticks (≈ 3 s) or right after "Finalizar tarefa".
const PROCESS_EVERY: u32 = 2;

pub struct SystemService {
    latest: Mutex<Option<Snapshot>>,
    history: Mutex<History>,
    processes: Mutex<Vec<ProcessGroup>>,
    refresh_processes: AtomicBool,
    pub scanning: AtomicBool,
    audit: AuditLog,
}

impl SystemService {
    pub fn latest(&self) -> Option<Snapshot> {
        self.latest.lock().expect("system lock").clone()
    }

    pub fn history(&self) -> Vec<HistoryPoint> {
        self.history.lock().expect("system lock").points()
    }

    pub fn processes(&self) -> Vec<ProcessGroup> {
        self.processes.lock().expect("system lock").clone()
    }

    /// Ask the worker to re-read processes on its next tick.
    pub fn refresh_soon(&self) {
        self.refresh_processes.store(true, Ordering::Relaxed);
    }

    pub fn audit(&self, tool: &str, detail: String, risk: AuditRisk, result: AuditResult) {
        let entry = AuditEntry {
            at_ms: now_ms(),
            tool: tool.to_owned(),
            detail,
            risk,
            result,
            origin: "ui".into(),
        };
        if let Err(err) = self.audit.append(&entry) {
            eprintln!("[ekko] falha ao gravar a auditoria: {err}");
        }
    }

    pub fn recent_audit(&self, limit: usize) -> Vec<AuditEntry> {
        self.audit.recent(limit)
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn spawn(app: &AppHandle) {
    let dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("ekko-hub"));
    app.manage(SystemService {
        latest: Mutex::new(None),
        history: Mutex::new(History::default()),
        processes: Mutex::new(Vec::new()),
        refresh_processes: AtomicBool::new(true),
        scanning: AtomicBool::new(false),
        audit: AuditLog::new(&dir),
    });
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-system".into())
        .spawn(move || run(&app));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o monitor do PC: {err}");
    }
}

fn run(app: &AppHandle) {
    // Created on this thread: the GPU counters hold raw handles that stay here.
    let mut monitor = match Monitor::new() {
        Ok(m) => m,
        Err(err) => return eprintln!("[ekko] monitor do PC indisponível: {err}"),
    };
    let service = app.state::<SystemService>();
    let mut tick: u32 = 0;
    loop {
        let snapshot = monitor.sample();
        service
            .history
            .lock()
            .expect("system lock")
            .push(HistoryPoint::from_snapshot(&snapshot));
        *service.latest.lock().expect("system lock") = Some(snapshot.clone());
        let _ = app.emit(SYSTEM_CHANGED, snapshot);

        let asked = service.refresh_processes.swap(false, Ordering::Relaxed);
        if asked || tick.is_multiple_of(PROCESS_EVERY) {
            let mut groups = monitor.processes();
            ekko_os::system::group::sort(&mut groups, Default::default());
            *service.processes.lock().expect("system lock") = groups.clone();
            let _ = app.emit(PROCESSES_CHANGED, groups);
        }
        tick = tick.wrapping_add(1);
        thread::sleep(TICK);
    }
}
