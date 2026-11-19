//! System HUD: the notch reacts to what changes on the PC (Caps Lock, mic mute,
//! brightness, power, Bluetooth headsets) and warns on low battery. The shell polls
//! the OS; this decides what is worth telling the UI. The first reading never fires,
//! so starting Ekko does not flash everything at once.

use std::collections::HashMap;

use serde::Serialize;

/// Laptop battery.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Battery {
    pub percent: u8,
    /// On the charger (it may be full and not charging).
    pub plugged: bool,
}

/// A connected Bluetooth device that reports its battery.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceBattery {
    pub name: String,
    pub percent: u8,
    pub kind: DeviceKind,
}

/// What the device is, for its icon in the pill.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DeviceKind {
    Headphones,
    Keyboard,
    Mouse,
    Phone,
    Gamepad,
    #[default]
    Other,
}

impl DeviceKind {
    /// From the Bluetooth "class of device" (major class in bits 8..12, peripheral
    /// subtype in bits 6..8 and 2..6).
    pub fn from_class(cod: u32) -> Self {
        let major = (cod >> 8) & 0x1F;
        let minor = (cod >> 2) & 0x3F;
        match major {
            0x02 => Self::Phone,
            0x04 => Self::Headphones,
            0x05 => match (minor >> 4, minor & 0x0F) {
                (_, 0x01 | 0x02) => Self::Gamepad,
                (0x01, _) => Self::Keyboard,
                (0x02 | 0x03, _) => Self::Mouse,
                _ => Self::Other,
            },
            _ => Self::Other,
        }
    }
}

/// What the pill's battery chip shows.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerSnapshot {
    /// None on desktops (no battery).
    pub battery: Option<Battery>,
    pub devices: Vec<DeviceBattery>,
}

/// One reading of the indicators polled often.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct Indicators {
    pub caps_lock: bool,
    /// None when there is no microphone.
    pub mic_muted: Option<bool>,
    /// 0..100; None when the screen has no software brightness (most desktops).
    pub brightness: Option<u8>,
}

/// A change worth a flash in the notch.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum HudEvent {
    CapsLock {
        on: bool,
    },
    Mic {
        muted: bool,
    },
    Brightness {
        level: u8,
    },
    /// Charger plugged in or out.
    Power {
        plugged: bool,
        percent: u8,
    },
    /// Below a warning step; `device` is None for the laptop itself.
    LowBattery {
        device: Option<String>,
        percent: u8,
    },
    /// A Bluetooth device (with battery) connected or disconnected.
    Device {
        name: String,
        percent: u8,
        connected: bool,
    },
}

/// Warning steps, highest first.
pub const LOW_STEPS: [u8; 3] = [15, 10, 5];
/// Back above step + this (or charging) re-arms the warning.
const REARM: u8 = 5;

/// Previous readings, to turn the next ones into events.
#[derive(Debug, Default)]
pub struct HudTracker {
    indicators: Option<Indicators>,
    power: Option<PowerSnapshot>,
    /// Lowest step already warned per battery ("" = the laptop).
    warned: HashMap<String, u8>,
}

impl HudTracker {
    pub fn indicators(&mut self, now: Indicators) -> Vec<HudEvent> {
        let Some(before) = self.indicators.replace(now) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        if now.caps_lock != before.caps_lock {
            out.push(HudEvent::CapsLock { on: now.caps_lock });
        }
        if let (Some(m), Some(b)) = (now.mic_muted, before.mic_muted)
            && m != b
        {
            out.push(HudEvent::Mic { muted: m });
        }
        if let (Some(level), Some(b)) = (now.brightness, before.brightness)
            && level != b
        {
            out.push(HudEvent::Brightness { level });
        }
        out
    }

    /// Events for a new power reading. The snapshot itself goes to the UI as is.
    pub fn power(&mut self, now: &PowerSnapshot) -> Vec<HudEvent> {
        let mut out = Vec::new();
        let before = self.power.replace(now.clone());
        if let (Some(b), Some(Some(was))) = (now.battery, before.as_ref().map(|p| p.battery))
            && b.plugged != was.plugged
        {
            out.push(HudEvent::Power {
                plugged: b.plugged,
                percent: b.percent,
            });
        }
        if let Some(before) = &before {
            for d in &now.devices {
                if !before.devices.iter().any(|x| x.name == d.name) {
                    out.push(device(d, true));
                }
            }
            for d in &before.devices {
                if !now.devices.iter().any(|x| x.name == d.name) {
                    out.push(device(d, false));
                    self.warned.remove(&d.name);
                }
            }
        }
        if let Some(b) = now.battery {
            out.extend(self.low(String::new(), b.percent, b.plugged));
        }
        for d in &now.devices {
            out.extend(self.low(d.name.clone(), d.percent, false));
        }
        out
    }

    /// Warns once per step while draining; charging or recovering re-arms it.
    fn low(&mut self, key: String, percent: u8, plugged: bool) -> Option<HudEvent> {
        let warned = self.warned.get(&key).copied();
        if plugged || warned.is_some_and(|w| percent >= w.saturating_add(REARM)) {
            self.warned.remove(&key);
            return None;
        }
        let step = LOW_STEPS.iter().copied().filter(|s| percent <= *s).min()?;
        if warned.is_some_and(|w| w <= step) {
            return None;
        }
        self.warned.insert(key.clone(), step);
        Some(HudEvent::LowBattery {
            device: (!key.is_empty()).then_some(key),
            percent,
        })
    }
}

fn device(d: &DeviceBattery, connected: bool) -> HudEvent {
    HudEvent::Device {
        name: d.name.clone(),
        percent: d.percent,
        connected,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn laptop(percent: u8, plugged: bool) -> PowerSnapshot {
        PowerSnapshot {
            battery: Some(Battery { percent, plugged }),
            devices: vec![],
        }
    }

    #[test]
    fn first_reading_is_silent_then_changes_fire() {
        let mut t = HudTracker::default();
        let idle = Indicators {
            caps_lock: false,
            mic_muted: Some(false),
            brightness: Some(50),
        };
        assert!(t.indicators(idle).is_empty());
        assert!(t.indicators(idle).is_empty());
        let changed = Indicators {
            caps_lock: true,
            mic_muted: Some(true),
            brightness: Some(60),
        };
        assert_eq!(
            t.indicators(changed),
            vec![
                HudEvent::CapsLock { on: true },
                HudEvent::Mic { muted: true },
                HudEvent::Brightness { level: 60 },
            ]
        );
        // A mic that disappears is not "unmuted".
        let gone = Indicators {
            mic_muted: None,
            ..changed
        };
        assert!(t.indicators(gone).is_empty());
    }

    #[test]
    fn charger_in_and_out() {
        let mut t = HudTracker::default();
        assert!(t.power(&laptop(80, false)).is_empty());
        assert_eq!(
            t.power(&laptop(80, true)),
            vec![HudEvent::Power {
                plugged: true,
                percent: 80
            }]
        );
    }

    #[test]
    fn low_battery_warns_once_per_step_and_rearms() {
        let mut t = HudTracker::default();
        let warn = |p| {
            vec![HudEvent::LowBattery {
                device: None,
                percent: p,
            }]
        };
        assert!(t.power(&laptop(30, false)).is_empty());
        assert!(t.power(&laptop(16, false)).is_empty());
        assert_eq!(t.power(&laptop(15, false)), warn(15));
        assert!(t.power(&laptop(14, false)).is_empty());
        assert_eq!(t.power(&laptop(9, false)), warn(9));
        assert!(t.power(&laptop(8, false)).is_empty());
        // Charging re-arms; draining again warns again.
        assert_eq!(t.power(&laptop(8, true)).len(), 1); // the "plugged" event only
        assert_eq!(
            t.power(&laptop(8, false))[1],
            HudEvent::LowBattery {
                device: None,
                percent: 8
            }
        );
        // Starting already low warns right away (it matters most then).
        let mut fresh = HudTracker::default();
        assert_eq!(fresh.power(&laptop(15, false)), warn(15));
    }

    #[test]
    fn headsets_connect_disconnect_and_warn() {
        let mut t = HudTracker::default();
        let buds = |p| PowerSnapshot {
            battery: None,
            devices: vec![DeviceBattery {
                name: "Fone".into(),
                percent: p,
                kind: DeviceKind::Headphones,
            }],
        };
        assert!(t.power(&PowerSnapshot::default()).is_empty());
        assert_eq!(
            t.power(&buds(60)),
            vec![HudEvent::Device {
                name: "Fone".into(),
                percent: 60,
                connected: true
            }]
        );
        assert_eq!(
            t.power(&buds(10)),
            vec![HudEvent::LowBattery {
                device: Some("Fone".into()),
                percent: 10
            }]
        );
        assert_eq!(
            t.power(&PowerSnapshot::default()),
            vec![HudEvent::Device {
                name: "Fone".into(),
                percent: 10,
                connected: false
            }]
        );
    }

    #[test]
    fn device_kind_from_bluetooth_class() {
        assert_eq!(DeviceKind::from_class(0x240404), DeviceKind::Headphones);
        assert_eq!(DeviceKind::from_class(0x002540), DeviceKind::Keyboard);
        assert_eq!(DeviceKind::from_class(0x002580), DeviceKind::Mouse);
        assert_eq!(DeviceKind::from_class(0x002508), DeviceKind::Gamepad);
        assert_eq!(DeviceKind::from_class(0x5a020c), DeviceKind::Phone);
        assert_eq!(DeviceKind::from_class(0), DeviceKind::Other);
    }

    #[test]
    fn events_serialize_with_a_kind_tag() {
        let json = serde_json::to_value(HudEvent::LowBattery {
            device: None,
            percent: 9,
        })
        .unwrap();
        assert_eq!(json["kind"], "lowBattery");
        assert_eq!(json["percent"], 9);
    }
}
