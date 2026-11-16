//! GPU load the way Task Manager computes it: PDH `GPU Engine` 3D utilization summed per
//! adapter (capped at 100) and the busiest adapter wins. VRAM from `GPU Adapter Memory`,
//! name and size from DXGI. Everything is optional: no counters → `None`, never a panic.

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

#[derive(Debug, Clone)]
pub struct Adapter {
    pub luid: String,
    pub name: String,
    pub vram: u64,
}

/// Picks the adapter to show and builds the stat (pure; `engines`/`memory` are PDH rows).
pub fn stat(adapters: &[Adapter], engines: &[(String, f64)], memory: &[(String, f64)]) -> GpuStat {
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
            Some(stat(&self.adapters, &engines, &memory))
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
    use windows::Win32::Foundation::ERROR_SUCCESS;
    use windows::Win32::Graphics::Dxgi::{
        CreateDXGIFactory1, DXGI_ADAPTER_FLAG_SOFTWARE, IDXGIFactory1,
    };
    use windows::Win32::System::Performance::{
        PDH_CSTATUS_NEW_DATA, PDH_CSTATUS_VALID_DATA, PDH_FMT, PDH_FMT_COUNTERVALUE_ITEM_W,
        PDH_FMT_DOUBLE, PDH_FMT_LARGE, PDH_HCOUNTER, PDH_HQUERY, PDH_MORE_DATA,
        PdhAddEnglishCounterW, PdhCloseQuery, PdhCollectQueryData, PdhGetFormattedCounterArrayW,
        PdhOpenQueryW,
    };
    use windows::core::{PCWSTR, w};

    use super::{Adapter, luid_key};

    type Rows = Vec<(String, f64)>;

    pub struct Pdh {
        query: PDH_HQUERY,
        engines: PDH_HCOUNTER,
        memory: Option<PDH_HCOUNTER>,
    }

    impl Pdh {
        pub fn open() -> Option<Self> {
            let mut query = PDH_HQUERY::default();
            let mut engines = PDH_HCOUNTER::default();
            let mut memory = PDH_HCOUNTER::default();
            // SAFETY: out-params are valid locals; the query is closed in Drop (or here).
            unsafe {
                if PdhOpenQueryW(PCWSTR::null(), 0, &mut query) != ERROR_SUCCESS.0 {
                    return None;
                }
                let path = w!("\\GPU Engine(*engtype_3D)\\Utilization Percentage");
                if PdhAddEnglishCounterW(query, path, 0, &mut engines) != ERROR_SUCCESS.0 {
                    PdhCloseQuery(query);
                    return None;
                }
                let mem_path = w!("\\GPU Adapter Memory(*)\\Dedicated Usage");
                let memory = (PdhAddEnglishCounterW(query, mem_path, 0, &mut memory)
                    == ERROR_SUCCESS.0)
                    .then_some(memory);
                // Rate counters need a first sample to diff against.
                PdhCollectQueryData(query);
                Some(Self {
                    query,
                    engines,
                    memory,
                })
            }
        }

        /// (3D engine %, dedicated bytes) per instance.
        pub fn collect(&mut self) -> Option<(Rows, Rows)> {
            // SAFETY: the handles stay alive as long as `self`.
            unsafe {
                if PdhCollectQueryData(self.query) != ERROR_SUCCESS.0 {
                    return None;
                }
                let engines = read_array(self.engines, PDH_FMT_DOUBLE)?;
                let memory = self
                    .memory
                    .and_then(|m| read_array(m, PDH_FMT_LARGE))
                    .unwrap_or_default();
                Some((engines, memory))
            }
        }
    }

    impl Drop for Pdh {
        fn drop(&mut self) {
            // SAFETY: opened in `open`, closed exactly once.
            unsafe {
                PdhCloseQuery(self.query);
            }
        }
    }

    /// Wildcard counter → (instance, value). Instances come and go between the size
    /// query and the read, so `MORE_DATA` is retried.
    unsafe fn read_array(counter: PDH_HCOUNTER, format: PDH_FMT) -> Option<Rows> {
        let item = size_of::<PDH_FMT_COUNTERVALUE_ITEM_W>();
        for _ in 0..3 {
            let (mut size, mut count) = (0u32, 0u32);
            // SAFETY: size query without a buffer.
            let status = unsafe {
                PdhGetFormattedCounterArrayW(counter, format, &mut size, &mut count, None)
            };
            if status != PDH_MORE_DATA {
                // No instance right now (nothing drawing): zero load, not an error.
                return (status == ERROR_SUCCESS.0).then(Vec::new);
            }
            let len = (size as usize).div_ceil(item);
            let mut buf = vec![PDH_FMT_COUNTERVALUE_ITEM_W::default(); len];
            // SAFETY: `buf` holds at least `size` bytes, aligned for the items.
            let status = unsafe {
                PdhGetFormattedCounterArrayW(
                    counter,
                    format,
                    &mut size,
                    &mut count,
                    Some(buf.as_mut_ptr()),
                )
            };
            if status == PDH_MORE_DATA {
                continue;
            }
            if status != ERROR_SUCCESS.0 {
                return None;
            }
            let rows = buf
                .iter()
                .take(count as usize)
                .filter(|i| {
                    i.FmtValue.CStatus == PDH_CSTATUS_VALID_DATA
                        || i.FmtValue.CStatus == PDH_CSTATUS_NEW_DATA
                })
                .map(|i| {
                    // SAFETY: PDH wrote a NUL-terminated name into `buf` and the union
                    // member that matches `format`.
                    unsafe {
                        let name = i.szName.to_string().unwrap_or_default();
                        let value = if format == PDH_FMT_LARGE {
                            i.FmtValue.Anonymous.largeValue as f64
                        } else {
                            i.FmtValue.Anonymous.doubleValue
                        };
                        (name, value)
                    }
                })
                .collect();
            return Some(rows);
        }
        None
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
