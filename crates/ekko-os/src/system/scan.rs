//! "Verificar meu PC": a few read-only checks, each with a pt-BR finding and (when it
//! can help) a suggested action. Nothing here changes the PC; the cleanups live in
//! `cleanup` and only run after the UI confirms. The finding builders are pure.

use std::path::PathBuf;
use std::time::Duration;

use serde::Serialize;
use sysinfo::{
    DiskRefreshKind, Disks, MemoryRefreshKind, ProcessRefreshKind, ProcessesToUpdate, System,
    UpdateKind,
};

use super::checks::{bin_check, cpu_check, disk_check, memory_check, startup_check, temp_check};
use super::cleanup;
use super::group::{self, ProcessGroup};
use super::monitor::{disk_stats, samples};
use super::startup;
use super::{MemoryStat, verinfo};

/// Cleanup only touches temp files older than this.
pub const TEMP_MIN_AGE_HOURS: u64 = 24;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CheckStatus {
    Ok,
    Warn,
    Info,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum ScanAction {
    CleanTemp { bytes: u64 },
    EmptyRecycleBin { bytes: u64 },
    OpenStartup,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckItem {
    pub label: String,
    pub detail: String,
    pub warn: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Check {
    pub id: String,
    pub label: String,
    pub status: CheckStatus,
    pub finding: String,
    /// Main number of the check (percent, count…), for the UI.
    pub value: Option<f64>,
    pub bytes: Option<u64>,
    pub items: Vec<CheckItem>,
    pub action: Option<ScanAction>,
}

impl Check {
    pub(crate) fn new(id: &str, status: CheckStatus, finding: String) -> Self {
        Self {
            id: id.to_owned(),
            label: label(id).to_owned(),
            status,
            finding,
            value: None,
            bytes: None,
            items: Vec::new(),
            action: None,
        }
    }
}

/// Progress event: `check` is None while the step is running.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub index: usize,
    pub total: usize,
    pub id: String,
    pub label: String,
    pub check: Option<Check>,
}

pub const STEPS: [&str; 6] = ["memory", "cpu", "startup", "temp", "bin", "disk"];

pub fn label(id: &str) -> &'static str {
    match id {
        "memory" => "Memória",
        "cpu" => "Processador",
        "startup" => "Programas na inicialização",
        "temp" => "Arquivos temporários",
        "bin" => "Lixeira",
        "disk" => "Espaço em disco",
        _ => "Verificação",
    }
}

/// Runs every check in order, reporting progress before and after each one.
pub fn run(on_progress: &mut dyn FnMut(ScanProgress)) -> Vec<Check> {
    let total = STEPS.len();
    let mut sys = System::new().ok();
    let mut checks = Vec::with_capacity(total);
    for (index, id) in STEPS.iter().enumerate() {
        let progress = |check| ScanProgress {
            index,
            total,
            id: (*id).to_owned(),
            label: label(id).to_owned(),
            check,
        };
        on_progress(progress(None));
        let check = run_step(id, sys.as_mut());
        on_progress(progress(Some(check.clone())));
        checks.push(check);
    }
    checks
}

fn run_step(id: &str, sys: Option<&mut System>) -> Check {
    match (id, sys) {
        ("memory", Some(sys)) => {
            sys.refresh_memory_specifics(MemoryRefreshKind::nothing().with_ram());
            let mem = MemoryStat {
                used: sys.used_memory(),
                total: sys.total_memory(),
                swap_used: 0,
                swap_total: 0,
            };
            memory_check(&mem, &groups(sys, false))
        }
        ("cpu", Some(sys)) => {
            let groups = groups(sys, true);
            let total = groups.iter().map(|g| g.cpu).sum::<f32>().min(100.0);
            cpu_check(total, &groups)
        }
        ("memory" | "cpu", None) => {
            Check::new(id, CheckStatus::Info, "Não consegui ler o sistema".into())
        }
        ("startup", _) => startup_check(&startup::list()),
        ("temp", _) => {
            let cutoff = cleanup::cutoff(TEMP_MIN_AGE_HOURS);
            let user = cleanup::user_temp()
                .map(|p| cleanup::dir_usage(&p, cutoff))
                .unwrap_or_default();
            let system_temp = std::env::var_os("SystemRoot")
                .map(|r| PathBuf::from(r).join("Temp"))
                .map(|p| cleanup::dir_usage(&p, cutoff))
                .unwrap_or_default();
            temp_check(&user, &system_temp)
        }
        ("bin", _) => bin_check(cleanup::recycle_bin()),
        _ => {
            let disks = Disks::new_with_refreshed_list_specifics(
                DiskRefreshKind::nothing().with_storage().with_kind(),
            )
            .map(|d| disk_stats(&d))
            .unwrap_or_default();
            disk_check(&disks)
        }
    }
}

/// Process groups; `cpu` takes a second sample (CPU usage is a delta).
fn groups(sys: &mut System, cpu: bool) -> Vec<ProcessGroup> {
    let kind = ProcessRefreshKind::nothing()
        .with_memory()
        .with_cpu()
        .with_exe(UpdateKind::OnlyIfNotSet);
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, kind);
    if cpu {
        std::thread::sleep(Duration::from_millis(800));
        sys.refresh_processes_specifics(ProcessesToUpdate::All, true, kind);
    }
    let cores = std::thread::available_parallelism().map_or(1, |n| n.get());
    let mut describe = |path: &str| verinfo::description(path);
    group::group(&samples(sys), cores, &mut describe)
}
