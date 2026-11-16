//! "Meu PC": live telemetry (CPU, RAM, GPU, disks, network), processes grouped by app,
//! ending tasks safely and the "Verificar meu PC" analysis. Windows code lives behind
//! `cfg(windows)`; the rules (grouping, protection, formatting) are pure and tested.

pub mod checks;
pub mod cleanup;
pub mod format;
pub mod gpu;
pub mod group;
pub mod history;
pub mod kill;
mod monitor;
pub mod protect;
pub mod scan;
pub mod startup;
#[cfg(test)]
mod tests;
mod verinfo;

use serde::Serialize;

pub use group::{ProcEntry, ProcSample, ProcessGroup, SortBy};
pub use history::{History, HistoryPoint};
pub use monitor::Monitor;
pub use protect::{Protection, protection};

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuStat {
    /// 0..100
    pub total: f32,
    pub cores: Vec<f32>,
    pub brand: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryStat {
    pub used: u64,
    pub total: u64,
    /// Page file (what Windows adds to the commit limit).
    pub swap_used: u64,
    pub swap_total: u64,
}

impl MemoryStat {
    pub fn percent(&self) -> f32 {
        format::percent(self.used, self.total)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskStat {
    /// "C:\"
    pub mount: String,
    pub label: String,
    pub total: u64,
    pub available: u64,
    pub removable: bool,
}

impl DiskStat {
    pub fn used_percent(&self) -> f32 {
        format::percent(self.total.saturating_sub(self.available), self.total)
    }

    pub fn free_percent(&self) -> f32 {
        format::percent(self.available, self.total)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetStat {
    pub rx_per_sec: u64,
    pub tx_per_sec: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuStat {
    /// 3D engine utilization of the busiest adapter, 0..100.
    pub usage: f32,
    pub name: Option<String>,
    pub vram_used: Option<u64>,
    pub vram_total: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub at_ms: u64,
    pub cpu: CpuStat,
    pub memory: MemoryStat,
    pub uptime_secs: u64,
    pub disks: Vec<DiskStat>,
    pub network: NetStat,
    /// None when the PC exposes no GPU counters.
    pub gpu: Option<GpuStat>,
    /// °C; None on most Windows PCs (needs vendor drivers / admin).
    pub temperature: Option<f32>,
    pub process_count: usize,
}

impl Snapshot {
    /// The Windows drive (C:) or the first fixed disk.
    pub fn system_disk(&self) -> Option<&DiskStat> {
        let system = std::env::var("SystemDrive").unwrap_or_else(|_| "C:".into());
        self.disks
            .iter()
            .find(|d| {
                d.mount
                    .to_ascii_uppercase()
                    .starts_with(&system.to_ascii_uppercase())
            })
            .or_else(|| self.disks.iter().find(|d| !d.removable))
    }
}

pub(crate) fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}
