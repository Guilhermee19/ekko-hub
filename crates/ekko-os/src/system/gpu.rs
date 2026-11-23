//! GPU load the way Task Manager computes it: PDH `GPU Engine` 3D utilization summed per
//! adapter (capped at 100) and the busiest adapter wins. VRAM from `GPU Adapter Memory`,
//! name and size from DXGI, temperature from the driver (see thermal.rs). Everything is
//! optional: no counters → `None`, never a panic.

use std::collections::HashMap;

use super::GpuStat;

/// "pid_1234_luid_0x00000000_0x0000D1F2_phys_0_eng_0_engtype_3D" → "0x00000000_0x0000d1f2".
pub fn luid_of(instance: &str) -> Option<String> {
    let rest = &instance[instance.find("luid_")? + 5..];
    let mut parts = rest.splitn(3, '_');
    let (high, low) = (parts.next()?, parts.next()?);
    (high.starts_with("0x") && low.starts_with("0x"))
        .then(|| format!("{high}_{low}").to_ascii_lowercase())
}

/// Sum per adapter (each capped at `cap`).
pub fn per_adapter(items: &[(String, f64)], cap: f64) -> HashMap<String, f64> {
    let mut sums: HashMap<String, f64> = HashMap::new();
    for (name, value) in items {
        if let Some(luid) = luid_of(name).filter(|_| value.is_finite() && *value > 0.0) {
            *sums.entry(luid).or_default() += value;
        }
    }
    sums.values_mut().for_each(|v| *v = v.min(cap));
    sums
}

/// The busiest adapter: (luid, utilization 0..100).
pub fn busiest(items: &[(String, f64)]) -> Option<(String, f64)> {
    per_adapter(items, 100.0)
        .into_iter()
        .max_by(|a, b| a.1.total_cmp(&b.1))
}

/// "0x00000000_0x0000d1f2" for a DXGI LUID (same shape as PDH instance names).
pub fn luid_key(high: i32, low: u32) -> String {
    format!("0x{:08x}_0x{low:08x}", high as u32)
}

/// Back from `luid_key` to (high, low), for driver calls that take a LUID.
pub fn luid_parts(key: &str) -> Option<(i32, u32)> {
    let (high, low) = key.split_once('_')?;
    let hex = |s: &str| u32::from_str_radix(s.strip_prefix("0x")?, 16).ok();
    Some((hex(high)? as i32, hex(low)?))
}

#[derive(Debug, Clone)]
pub struct Adapter {
    pub luid: String,
    pub name: String,
    pub vram: u64,
}

/// Hottest adapter that has a sensor. On laptops with two GPUs the busy one is often
/// the integrated chip, which reports nothing; the dedicated card is what heats up.
pub fn hottest(adapters: &[Adapter], temperature: impl Fn(&str) -> Option<f32>) -> Option<f32> {
    adapters
        .iter()
        .filter_map(|a| temperature(&a.luid))
        .reduce(f32::max)
}

/// Picks the adapter to show and builds the stat (pure; `engines`/`memory` are PDH rows).
pub fn stat(
    adapters: &[Adapter],
    engines: &[(String, f64)],
    memory: &[(String, f64)],
    temperature: Option<f32>,
) -> GpuStat {
    let main = adapters.iter().max_by_key(|a| a.vram);
    let (luid, usage) = busiest(engines)
        .or_else(|| main.map(|a| (a.luid.clone(), 0.0)))
        .unwrap_or_default();
    let adapter = adapters.iter().find(|a| a.luid == luid).or(main);
    let used = per_adapter(memory, f64::MAX);
    let vram_used = match adapter {
        Some(a) => used.get(&a.luid).copied(),
        None => used.values().copied().reduce(f64::max),
    };
    GpuStat {
        usage: usage as f32,
        name: adapter.map(|a| a.name.clone()),
        vram_used: vram_used.map(|v| v as u64),
        vram_total: adapter.map(|a| a.vram).filter(|v| *v > 0),
        temperature,
    }
}

pub struct GpuSampler {
    #[cfg(windows)]
    pdh: Option<win::Pdh>,
    adapters: Vec<Adapter>,
}

impl GpuSampler {
    pub fn new() -> Self {
        Self {
            #[cfg(windows)]
            pdh: win::Pdh::open(),
            #[cfg(windows)]
            adapters: win::adapters(),
            #[cfg(not(windows))]
            adapters: Vec::new(),
        }
    }

    /// None when this PC has no GPU counters (VMs, very old drivers).
    pub fn sample(&mut self) -> Option<GpuStat> {
        #[cfg(windows)]
        {
            let (engines, memory) = self.pdh.as_mut()?.collect()?;
            let temperature = hottest(&self.adapters, |luid| {
                let (high, low) = luid_parts(luid)?;
                super::thermal::gpu_temperature(high, low)
            });
            Some(stat(&self.adapters, &engines, &memory, temperature))
        }
        #[cfg(not(windows))]
        {
            let _ = &self.adapters;
            None
        }
    }
}

impl Default for GpuSampler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(windows)]
mod win {
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, IDXGIFactory1,
    };
    use windows::Win32::System::Performance::{PDH_FMT_DOUBLE, PDH_FMT_LARGE, PDH_HCOUNTER};
    use windows::core::w;

    use super::super::pdh::{Query, Rows, read_array};
    use super::{Adapter, luid_key};

    pub struct Pdh {
        query: Query,
        engines: PDH_HCOUNTER,
        memory: Option<PDH_HCOUNTER>,
    }

    impl Pdh {
        pub fn open() -> Option<Self> {
            let query = Query::open()?;
            let engines = query.add(w!("\\GPU Engine(*engtype_3D)\\Utilization Percentage"))?;
            let memory = query.add(w!("\\GPU Adapter Memory(*)\\Dedicated Usage"));
            // Rate counters need a first sample to diff against.
            query.collect();
            Some(Self {
                query,
                engines,
                memory,
            })
        }

        /// (3D engine %, dedicated bytes) per instance.
        pub fn collect(&mut self) -> Option<(Rows, Rows)> {
            if !self.query.collect() {
                return None;
            }
            // SAFETY: the counters belong to `self.query`, open while `self` lives.
            unsafe {
                let engines = read_array(self.engines, PDH_FMT_DOUBLE)?;
                let memory = self
                    .memory
                    .and_then(|m| read_array(m, PDH_FMT_LARGE))
                    .unwrap_or_default();
                Some((engines, memory))
            }
        }
    }

    /// Hardware adapters (the software "Basic Render Driver" is skipped).
    pub fn adapters() -> Vec<Adapter> {
        let mut out = Vec::new();
        // SAFETY: plain DXGI enumeration; a failing call ends the loop.
        unsafe {
            let Ok(factory) = CreateDXGIFactory1::<IDXGIFactory1>() else {
                return out;
            };
            let mut i = 0;
            while let Ok(adapter) = factory.EnumAdapters1(i) {
                i += 1;
                let Ok(desc) = adapter.GetDesc1() else {
                    continue;
                };
                if desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE.0 as u32 != 0 {
                    continue;
                }
                let len = desc
                    .Description
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(desc.Description.len());
                out.push(Adapter {
                    luid: luid_key(desc.AdapterLuid.HighPart, desc.AdapterLuid.LowPart),
                    name: String::from_utf16_lossy(&desc.Description[..len])
                        .trim()
                        .to_owned(),
                    vram: desc.DedicatedVideoMemory as u64,
                });
            }
        }
        out
    }
}
