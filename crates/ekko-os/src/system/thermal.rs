//! Temperatures without admin rights or extra drivers:
//! - system/CPU: the ACPI thermal zones from the "Thermal Zone Information" counters
//!   (the WMI class sysinfo reads, MSAcpi_ThermalZoneTemperature, is admin-only);
//! - GPU: the driver's own reading, the one Task Manager shows (D3DKMT perf data). It
//!   does not wake a sleeping laptop GPU: a powered-down card just reports nothing.

/// Readings outside this range are sensor junk (unset zones report 0 K or -273 °C).
const SANE: std::ops::RangeInclusive<f32> = 5.0..=125.0;

fn sane(celsius: f32) -> Option<f32> {
    (celsius.is_finite() && SANE.contains(&celsius)).then_some(celsius)
}

/// The hottest valid zone. `tenths` = "High Precision Temperature" (0.1 K), else K.
pub fn hottest_zone(rows: &[(String, f64)], tenths: bool) -> Option<f32> {
    let scale = if tenths { 10.0 } else { 1.0 };
    rows.iter()
        .filter_map(|(_, k)| sane((k / scale - 273.15) as f32))
        .reduce(f32::max)
}

/// The driver reports tenths of °C; 0 means "no reading" (card asleep or no sensor).
pub fn gpu_celsius(deci: u32) -> Option<f32> {
    (deci > 0).then(|| sane(deci as f32 / 10.0)).flatten()
}

/// ACPI thermal zones, sampled through PDH.
pub struct ThermalSampler {
    #[cfg(windows)]
    zones: Option<win::Zones>,
}

impl ThermalSampler {
    pub fn new() -> Self {
        Self {
            #[cfg(windows)]
            zones: win::Zones::open(),
        }
    }

    /// °C of the hottest zone; None when the PC exposes none.
    pub fn sample(&mut self) -> Option<f32> {
        #[cfg(windows)]
        {
            self.zones.as_ref()?.hottest()
        }
        #[cfg(not(windows))]
        {
            None
        }
    }
}

impl Default for ThermalSampler {
    fn default() -> Self {
        Self::new()
    }
}

/// GPU °C for the adapter with this LUID; None off Windows or without a reading.
pub fn gpu_temperature(luid_high: i32, luid_low: u32) -> Option<f32> {
    #[cfg(windows)]
    {
        win::gpu_temperature(luid_high, luid_low)
    }
    #[cfg(not(windows))]
    {
        let _ = (luid_high, luid_low);
        None
    }
}

#[cfg(windows)]
mod win {
    use windows::Wdk::Graphics::Direct3D::{
        D3DKMT_ADAPTER_PERFDATA, D3DKMT_CLOSEADAPTER, D3DKMT_OPENADAPTERFROMLUID,
        D3DKMT_QUERYADAPTERINFO, D3DKMTCloseAdapter, D3DKMTOpenAdapterFromLuid,
        D3DKMTQueryAdapterInfo, KMTQAITYPE_ADAPTERPERFDATA,
    };
    use windows::Win32::Foundation::LUID;
    use windows::Win32::System::Performance::{PDH_FMT_DOUBLE, PDH_HCOUNTER};
    use windows::core::w;

    use super::super::pdh::{Query, read_array};
    use super::{gpu_celsius, hottest_zone};

    pub struct Zones {
        query: Query,
        counter: PDH_HCOUNTER,
        /// The counter is in tenths of a kelvin (newer Windows) instead of kelvin.
        tenths: bool,
    }

    impl Zones {
        pub fn open() -> Option<Self> {
            let query = Query::open()?;
            let precise = query.add(w!(
                "\\Thermal Zone Information(*)\\High Precision Temperature"
            ));
            let (counter, tenths) = match precise {
                Some(c) => (c, true),
                None => (
                    query.add(w!("\\Thermal Zone Information(*)\\Temperature"))?,
                    false,
                ),
            };
            Some(Self {
                query,
                counter,
                tenths,
            })
        }

        pub fn hottest(&self) -> Option<f32> {
            if !self.query.collect() {
                return None;
            }
            // SAFETY: the counter belongs to `self.query`, open while `self` lives.
            let rows = unsafe { read_array(self.counter, PDH_FMT_DOUBLE) }?;
            hottest_zone(&rows, self.tenths)
        }
    }

    pub fn gpu_temperature(high: i32, low: u32) -> Option<f32> {
        let mut open = D3DKMT_OPENADAPTERFROMLUID {
            AdapterLuid: LUID {
                LowPart: low,
                HighPart: high,
            },
            ..Default::default()
        };
        // SAFETY: plain struct in/out; the adapter handle is closed below.
        unsafe {
            if D3DKMTOpenAdapterFromLuid(&mut open).is_err() {
                return None;
            }
            let mut perf = D3DKMT_ADAPTER_PERFDATA::default();
            let mut query = D3DKMT_QUERYADAPTERINFO {
                hAdapter: open.hAdapter,
                Type: KMTQAITYPE_ADAPTERPERFDATA,
                pPrivateDriverData: (&raw mut perf).cast(),
                PrivateDriverDataSize: size_of::<D3DKMT_ADAPTER_PERFDATA>() as u32,
            };
            let ok = D3DKMTQueryAdapterInfo(&mut query).is_ok();
            let _ = D3DKMTCloseAdapter(&D3DKMT_CLOSEADAPTER {
                hAdapter: open.hAdapter,
            });
            ok.then(|| gpu_celsius(perf.Temperature)).flatten()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::system::gpu::{luid_key, luid_parts};

    #[test]
    fn zones_in_kelvin_or_tenths_pick_the_hottest_valid_one() {
        let rows = |v: &[f64]| v.iter().map(|k| ("z".to_owned(), *k)).collect::<Vec<_>>();
        // A real laptop reading: 3322 tenths of K = 59 °C.
        let t = hottest_zone(&rows(&[3322.0, 3010.0]), true).unwrap();
        assert!((t - 59.05).abs() < 0.01, "{t}");
        assert_eq!(
            hottest_zone(&rows(&[332.0]), false).map(f32::round),
            Some(59.0)
        );
        // Unset zones (0 K) and absurd values are ignored.
        assert_eq!(hottest_zone(&rows(&[0.0, 5000.0]), true), None);
        assert_eq!(hottest_zone(&[], true), None);
    }

    #[test]
    fn gpu_reading_is_tenths_and_zero_means_none() {
        assert_eq!(gpu_celsius(523), Some(52.3));
        assert_eq!(gpu_celsius(0), None);
        assert_eq!(gpu_celsius(9999), None);
    }

    #[test]
    fn gpu_temperature_comes_from_the_hottest_card_with_a_sensor() {
        use crate::system::gpu::{Adapter, hottest};
        let card = |luid: &str| Adapter {
            luid: luid.into(),
            name: luid.into(),
            vram: 0,
        };
        let cards = [card("intel"), card("nvidia"), card("basic")];
        let reading = |luid: &str| match luid {
            "nvidia" => Some(54.0),
            "intel" => Some(41.0),
            _ => None,
        };
        assert_eq!(hottest(&cards, reading), Some(54.0));
        assert_eq!(hottest(&cards, |_| None), None);
    }

    #[test]
    fn luid_keys_round_trip() {
        for (high, low) in [(0, 0xd1f2), (-1, u32::MAX), (7, 1)] {
            assert_eq!(luid_parts(&luid_key(high, low)), Some((high, low)));
        }
        assert_eq!(luid_parts("nope"), None);
    }
}
