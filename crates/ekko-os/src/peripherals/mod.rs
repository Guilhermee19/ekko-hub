//! Batteries of wireless peripherals on a USB dongle (2.4 GHz headsets and mice).
//! Windows has no common API for them (only Bluetooth has one), so each brand gets a
//! small driver over its own HID protocol. A background thread rescans the dongles;
//! devices that push their level (mice) get a reader thread each. New device = one
//! driver file plus a branch in `scan`.

mod attack_shark;
#[cfg(windows)]
mod hid;
mod hyperx;

use std::collections::HashMap;
use std::time::{Duration, Instant};

use ekko_core::hud::{DeviceBattery, DeviceKind};

/// What a driver reads from its device.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Reading {
    pub percent: u8,
    /// On the cable or dock (charging or already full).
    pub charging: bool,
}

/// One HID top-level collection of a connected device.
#[derive(Debug, Clone, Default)]
pub struct HidInfo {
    pub path: String,
    pub vid: u16,
    pub pid: u16,
    pub usage_page: u16,
    pub usage: u16,
    pub input_len: u16,
    pub feature_len: u16,
}

/// Vendors with a driver; other HID devices are never opened.
const VIDS: [u16; 2] = [hyperx::VID, attack_shark::VID];
/// How often dongles are rescanned and headsets asked again.
const SCAN: Duration = Duration::from_secs(10);
/// A mouse that stopped talking for this long is off (it sleeps silently first).
const SILENT: Duration = Duration::from_secs(15 * 60);

/// Wireless USB peripherals with a known battery, sorted by name. The first call
/// starts the scanner, so the list fills in a moment later.
pub fn batteries() -> Vec<DeviceBattery> {
    #[cfg(windows)]
    {
        win::batteries()
    }
    #[cfg(not(windows))]
    {
        Vec::new()
    }
}

/// One entry per device: a mouse on its cable shows up as a second USB device while
/// the dongle goes quiet, so the freshest reading of each name wins. Silent ones drop.
fn freshest(found: impl IntoIterator<Item = (DeviceBattery, Instant)>) -> Vec<DeviceBattery> {
    let mut by_name: HashMap<String, (DeviceBattery, Instant)> = HashMap::new();
    for (d, at) in found {
        if at.elapsed() >= SILENT {
            continue;
        }
        match by_name.get(&d.name) {
            Some((_, seen)) if *seen >= at => {}
            _ => {
                by_name.insert(d.name.clone(), (d, at));
            }
        }
    }
    let mut out: Vec<DeviceBattery> = by_name.into_values().map(|(d, _)| d).collect();
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

fn device(name: &str, kind: DeviceKind, r: Reading) -> DeviceBattery {
    DeviceBattery {
        name: name.to_string(),
        percent: r.percent.min(100),
        kind,
        charging: r.charging,
    }
}

/// `\\?\hid#vid_0951&pid_170b…` belongs to one of our vendors.
fn known_vendor(path: &str) -> bool {
    let path = path.to_ascii_lowercase();
    VIDS.iter().any(|v| path.contains(&format!("vid_{v:04x}")))
}

#[cfg(windows)]
mod win {
    use std::collections::{HashMap, HashSet};
    use std::sync::{LazyLock, Mutex, Once};
    use std::thread;
    use std::time::Instant;

    use ekko_core::hud::{DeviceBattery, DeviceKind};

    use super::{HidInfo, SCAN, attack_shark, device, hid, hyperx, known_vendor};

    #[derive(Default)]
    struct Shared {
        /// By HID path: the last battery read and when.
        found: HashMap<String, (DeviceBattery, Instant)>,
        /// Paths with a reader thread running.
        listening: HashSet<String>,
    }

    static SHARED: LazyLock<Mutex<Shared>> = LazyLock::new(Mutex::default);
    static START: Once = Once::new();

    pub fn batteries() -> Vec<DeviceBattery> {
        START.call_once(|| {
            let _ = thread::Builder::new()
                .name("ekko-peripherals".into())
                .spawn(|| {
                    loop {
                        scan();
                        thread::sleep(SCAN);
                    }
                });
        });
        let shared = SHARED.lock().expect("peripherals lock");
        super::freshest(shared.found.values().cloned())
    }

    fn scan() {
        let infos = hid::list(known_vendor);
        for info in &infos {
            if hyperx::matches(info) {
                let read = hid::Device::open(&info.path, true)
                    .and_then(|d| hyperx::query(&d, info.feature_len as usize));
                let found = read.map(|r| device(hyperx::NAME, DeviceKind::Headphones, r));
                put(&info.path, found);
            } else if attack_shark::matches(info) {
                listen(info);
            }
        }
        // Dongle unplugged: forget what it reported.
        let present: HashSet<&str> = infos.iter().map(|i| i.path.as_str()).collect();
        let mut shared = SHARED.lock().expect("peripherals lock");
        shared
            .found
            .retain(|path, _| present.contains(path.as_str()));
    }

    fn put(path: &str, found: Option<DeviceBattery>) {
        let mut shared = SHARED.lock().expect("peripherals lock");
        match found {
            Some(d) => shared.found.insert(path.to_string(), (d, Instant::now())),
            None => shared.found.remove(path),
        };
    }

    /// One reader per mouse dongle; it ends when the dongle goes away.
    fn listen(info: &HidInfo) {
        let path = info.path.clone();
        if !SHARED
            .lock()
            .expect("peripherals lock")
            .listening
            .insert(path.clone())
        {
            return;
        }
        let len = info.input_len as usize;
        let spawned = thread::Builder::new()
            .name("ekko-mouse-battery".into())
            .spawn(move || {
                if let Some(dev) = hid::Device::open(&path, false) {
                    let mut debounce = attack_shark::Debounce::default();
                    let mut buf = vec![0u8; len];
                    while dev.read(&mut buf) {
                        if let Some(frame) =
                            attack_shark::parse(&buf).and_then(|f| debounce.feed(f))
                            && let Some(r) = attack_shark::reading(frame)
                        {
                            put(
                                &path,
                                Some(device(
                                    attack_shark::name(frame.model),
                                    DeviceKind::Mouse,
                                    r,
                                )),
                            );
                        }
                    }
                }
                let mut shared = SHARED.lock().expect("peripherals lock");
                shared.listening.remove(&path);
                shared.found.remove(&path);
            });
        if spawned.is_err() {
            SHARED
                .lock()
                .expect("peripherals lock")
                .listening
                .remove(&info.path);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_known_vendors_are_opened() {
        assert!(known_vendor(
            r"\\?\hid#vid_0951&pid_170b&mi_03&col03#8&2ce2d909"
        ));
        assert!(known_vendor(r"\\?\HID#VID_1D57&PID_FA60&MI_02&COL03#9"));
        assert!(!known_vendor(r"\\?\hid#vid_046d&pid_c52b&mi_02"));
    }

    #[test]
    fn same_mouse_on_cable_and_dongle_keeps_the_freshest() {
        let now = Instant::now();
        let x3 = |percent, charging| DeviceBattery {
            name: "Attack Shark X3".into(),
            percent,
            kind: DeviceKind::Mouse,
            charging,
        };
        let earlier = now.checked_sub(Duration::from_secs(60)).unwrap();
        let gone = now.checked_sub(SILENT + Duration::from_secs(1)).unwrap();
        let got = freshest([(x3(30, false), earlier), (x3(100, true), now)]);
        assert_eq!(got, vec![x3(100, true)]);
        assert!(freshest([(x3(30, false), gone)]).is_empty());
    }

    #[test]
    fn device_clamps_percent() {
        let d = device(
            "Mouse",
            DeviceKind::Mouse,
            Reading {
                percent: 140,
                charging: true,
            },
        );
        assert_eq!(d.percent, 100);
        assert!(d.charging);
    }
}
