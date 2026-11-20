//! Attack Shark mice on the Xenta/Beken 2.4G receiver (1D57). The receiver pushes
//! `03 MM 40 ST NN` about every 2 s on interface 2, usage page 0x000A; nothing is
//! ever sent to it. MM is the model, ST the power state, NN the level. Protocol from
//! attackshark-battery-windows, mouse-battery-tray and mouse_tray, checked on an X3.

use super::{HidInfo, Reading};

pub const VID: u16 = 0x1D57;
/// Receiver; X3 and X11 on their cable (the receiver goes quiet then, and the
/// mouse pushes the same frames over USB, with ST = charging).
const PIDS: [u16; 3] = [0xFA60, 0xFA61, 0xFA55];
/// Models that report 0..=10 instead of a percent.
const TENS: [u8; 2] = [0x10, 0x85];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Frame {
    pub model: u8,
    state: u8,
    level: u8,
}

pub fn matches(info: &HidInfo) -> bool {
    info.vid == VID && PIDS.contains(&info.pid) && info.usage_page == 0x000A && info.input_len >= 5
}

/// Battery frames only; `03 MM 01 00 00` (link blink) would read as 0 %.
pub fn parse(r: &[u8]) -> Option<Frame> {
    (r.len() >= 5 && r[0] == 0x03 && r[2] == 0x40).then(|| Frame {
        model: r[1],
        state: r[3],
        level: r[4],
    })
}

/// ST 1: on battery; 2: on power, not charging; 3: charging.
pub fn reading(f: Frame) -> Option<Reading> {
    let percent = if TENS.contains(&f.model) && f.level <= 10 {
        f.level * 10
    } else {
        f.level
    };
    (percent <= 100).then_some(Reading {
        percent,
        charging: matches!(f.state, 0x02 | 0x03),
    })
}

pub fn name(model: u8) -> &'static str {
    match model {
        0x10 => "Attack Shark X3",
        0x55 => "Attack Shark X11",
        0x85 => "Attack Shark X6",
        0xB1 => "Attack Shark X1",
        _ => "Mouse Attack Shark",
    }
}

/// Each (re)link sends one bogus "100 %": a frame counts only when it repeats.
#[derive(Debug, Default)]
pub struct Debounce {
    last: Option<Frame>,
}

impl Debounce {
    pub fn feed(&mut self, f: Frame) -> Option<Frame> {
        (self.last.replace(f) == Some(f)).then_some(f)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn x3_on_its_cable_reports_charging() {
        // Captured on an X3 on the cable (1D57:FA61).
        let f = parse(&[0x03, 0x10, 0x40, 0x03, 0x0A]).unwrap();
        assert_eq!(
            reading(f),
            Some(Reading {
                percent: 100,
                charging: true
            })
        );
    }

    #[test]
    fn x3_reports_tens() {
        // Captured on an X3: on battery, level 4 → 40 %.
        let f = parse(&[0x03, 0x10, 0x40, 0x01, 0x04]).unwrap();
        assert_eq!(name(f.model), "Attack Shark X3");
        assert_eq!(
            reading(f),
            Some(Reading {
                percent: 40,
                charging: false
            })
        );
    }

    #[test]
    fn other_models_report_percent_and_charging() {
        let f = parse(&[0x03, 0xB1, 0x40, 0x03, 0x5A]).unwrap();
        assert_eq!(
            reading(f),
            Some(Reading {
                percent: 90,
                charging: true
            })
        );
        assert_eq!(name(0x42), "Mouse Attack Shark");
    }

    #[test]
    fn ignores_link_blink_and_garbage() {
        assert_eq!(parse(&[0x03, 0x10, 0x01, 0x00, 0x00]), None);
        assert_eq!(parse(&[0x03, 0x10]), None);
        let bad = parse(&[0x03, 0x55, 0x40, 0x01, 0xC8]).unwrap();
        assert_eq!(reading(bad), None);
    }

    #[test]
    fn debounce_needs_two_equal_frames() {
        let mut d = Debounce::default();
        let a = parse(&[0x03, 0x10, 0x40, 0x01, 0x0A]).unwrap();
        let b = parse(&[0x03, 0x10, 0x40, 0x01, 0x04]).unwrap();
        assert_eq!(d.feed(a), None);
        assert_eq!(d.feed(b), None);
        assert_eq!(d.feed(b), Some(b));
    }
}
