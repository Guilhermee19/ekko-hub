//! Long-lived sampler: one `sysinfo::System` (CPU usage and network rates are deltas,
//! so the same instance must be refreshed every tick). Owned by a single worker thread.

use std::collections::HashMap;
use std::time::Instant;

use sysinfo::{
    Components, CpuRefreshKind, DiskRefreshKind, Disks, MemoryRefreshKind, Networks,
    ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind,
};

use super::format::rate;
use super::gpu::GpuSampler;
use super::group::{self, ProcSample, ProcessGroup};
use super::{CpuStat, DiskStat, MemoryStat, NetStat, Snapshot, now_ms, verinfo};

/// Disks and sensors change slowly; refresh them every N samples.
const SLOW_EVERY: u32 = 8;

pub struct Monitor {
    sys: System,
    networks: Networks,
    disks: Disks,
    components: Option<Components>,
    gpu: GpuSampler,
    net_totals: Option<(u64, u64, Instant)>,
    /// exe path → file description (version info is read once per exe).
    labels: HashMap<String, Option<String>>,
    ticks: u32,
    temperature: Option<f32>,
}

impl Monitor {
    /// Fails only when sysinfo cannot read the system at all.
    pub fn new() -> Result<Self, String> {
        let refresh = RefreshKind::nothing()
            .with_cpu(CpuRefreshKind::nothing().with_usage())
            .with_memory(MemoryRefreshKind::everything());
        let sys = System::new_with_specifics(refresh).map_err(|e| e.to_string())?;
        let disks =
            Disks::new_with_refreshed_list_specifics(storage()).map_err(|e| e.to_string())?;
        let networks = Networks::new_with_refreshed_list().map_err(|e| e.to_string())?;
        // Sensors via WMI: usually empty on Windows without vendor drivers.
        let components = Components::new_with_refreshed_list()
            .ok()
            .filter(|c| !c.is_empty());
        Ok(Self {
            sys,
            networks,
            disks,
            components,
            gpu: GpuSampler::new(),
            net_totals: None,
            labels: HashMap::new(),
            ticks: 0,
            temperature: None,
        })
    }

    /// One telemetry sample. Call every ~1-2 s; the first CPU/network values are 0.
    pub fn sample(&mut self) -> Snapshot {
        self.ticks = self.ticks.wrapping_add(1);
        self.sys
            .refresh_cpu_specifics(CpuRefreshKind::nothing().with_usage());
        self.sys
            .refresh_memory_specifics(MemoryRefreshKind::everything());
        self.networks.refresh(true);
        if self.ticks.is_multiple_of(SLOW_EVERY) {
            self.disks.refresh_specifics(true, storage());
            if let Some(components) = &mut self.components {
                components.refresh(false);
            }
        }
        if self.ticks == 1 || self.ticks.is_multiple_of(SLOW_EVERY) {
            self.temperature = self.components.as_ref().and_then(|c| {
                c.iter()
                    .filter_map(|c| c.temperature())
                    .filter(|t| t.is_finite() && *t > 0.0)
                    .reduce(f32::max)
            });
        }
        let cpus = self.sys.cpus();
        Snapshot {
            at_ms: now_ms(),
            cpu: CpuStat {
                total: self.sys.global_cpu_usage().clamp(0.0, 100.0),
                cores: cpus.iter().map(|c| c.usage().clamp(0.0, 100.0)).collect(),
                brand: cpus
                    .first()
                    .map(|c| c.brand().trim().to_owned())
                    .unwrap_or_default(),
            },
            memory: MemoryStat {
                used: self.sys.used_memory(),
                total: self.sys.total_memory(),
                swap_used: self.sys.used_swap(),
                swap_total: self.sys.total_swap(),
            },
            uptime_secs: System::uptime().unwrap_or(0),
            disks: disk_stats(&self.disks),
            network: self.network(),
            gpu: self.gpu.sample(),
            temperature: self.temperature,
            process_count: self.sys.processes().len(),
        }
    }

    /// Re-reads every process (≈ tens of ms) and groups them by executable.
    pub fn processes(&mut self) -> Vec<ProcessGroup> {
        let kind = ProcessRefreshKind::nothing()
            .with_cpu()
            .with_memory()
            .with_exe(UpdateKind::OnlyIfNotSet);
        self.sys
            .refresh_processes_specifics(ProcessesToUpdate::All, true, kind);
        let samples = samples(&self.sys);
        let labels = &mut self.labels;
        let mut describe = |path: &str| {
            labels
                .entry(path.to_owned())
                .or_insert_with(|| verinfo::description(path))
                .clone()
        };
        group::group(&samples, self.sys.cpus().len(), &mut describe)
    }

    fn network(&mut self) -> NetStat {
        let (rx, tx) = self.networks.values().fold((0u64, 0u64), |(r, t), n| {
            (r + n.total_received(), t + n.total_transmitted())
        });
        let now = Instant::now();
        let stat = match self.net_totals {
            Some((prx, ptx, at)) => {
                let secs = now.duration_since(at).as_secs_f64();
                NetStat {
                    rx_per_sec: rate(prx, rx, secs),
                    tx_per_sec: rate(ptx, tx, secs),
                }
            }
            None => NetStat::default(),
        };
        self.net_totals = Some((rx, tx, now));
        stat
    }
}

fn storage() -> DiskRefreshKind {
    DiskRefreshKind::nothing().with_storage().with_kind()
}

pub(crate) fn disk_stats(disks: &Disks) -> Vec<DiskStat> {
    let mut out: Vec<DiskStat> = disks
        .iter()
        .filter(|d| d.total_space() > 0)
        .map(|d| DiskStat {
            mount: d.mount_point().to_string_lossy().into_owned(),
            label: d.name().to_string_lossy().into_owned(),
            total: d.total_space(),
            available: d.available_space(),
            removable: d.is_removable(),
        })
        .collect();
    out.sort_by(|a, b| a.mount.cmp(&b.mount));
    out.dedup_by(|a, b| a.mount == b.mount);
    out
}

pub(crate) fn samples(sys: &System) -> Vec<ProcSample> {
    sys.processes()
        .values()
        .map(|p| ProcSample {
            pid: p.pid().as_u32(),
            parent: p.parent().map(|p| p.as_u32()),
            name: p.name().to_string_lossy().into_owned(),
            exe: p.exe().map(|e| e.to_string_lossy().into_owned()),
            cpu: p.cpu_usage(),
            memory: p.memory(),
        })
        .collect()
}
