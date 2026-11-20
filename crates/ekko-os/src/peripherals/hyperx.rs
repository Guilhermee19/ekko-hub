//! HyperX Cloud Stinger Core Wireless on the Kingston receiver (0951:170B).
//! Asked over feature report 0xFF on the vendor collection (FF00:0001). The reply
//! lands 2-50 ms later and is readable only for ~10 ms; before and after that,
//! GetFeature returns a stale one, so we poll back to back for the reply header.
//! Protocol from HyperBatteryMonitor and nogenuity, checked on a real unit.

use super::{HidInfo, Reading};

pub const VID: u16 = 0x0951;
const PIDS: [u16; 1] = [0x170B];
pub const NAME: &str = "HyperX Cloud Stinger Core";

/// "Is the headset on?" Reply header `FF 0C 05`.
const CONNECTION: [u8; 20] = [
    0xFF, 0x07, 0x00, 0xFD, 0x04, 0x00, 0x00, 0x02, 0x82, 0x03, 0x05, 0x29, 0x0F, 0x00, 0x00, 0x03,
    0x68, 0x10, 0x00, 0x00,
];
/// "Battery state and voltage." Reply header `FF 12 05`.
const BATTERY: [u8; 12] = [
    0xFF, 0x07, 0x00, 0xFD, 0x04, 0x0C, 0xF1, 0x02, 0x01, 0x04, 0xF0, 0x0C,
];

/// Li-ion curve (mV for 100, 90 … 0 %); generic, so the percent is approximate.
const DISCHARGING_MV: [u16; 11] = [
    4121, 4042, 3954, 3905, 3838, 3785, 3763, 3738, 3700, 3651, 3517,
];
/// Voltage reads higher on the cable.
const CHARGING_MV: [u16; 11] = [
    4130, 4090, 4050, 4000, 3967, 3946, 3930, 3916, 3871, 3831, 3400,
];

pub fn matches(info: &HidInfo) -> bool {
    info.vid == VID
        && PIDS.contains(&info.pid)
        && info.usage_page == 0xFF00
        && info.usage == 0x0001
        && info.feature_len >= 32
}

/// Fresh reply to `CONNECTION`: whether the headset is on.
fn parse_connection(r: &[u8]) -> Option<bool> {
    (r.len() > 11 && r[..3] == [0xFF, 0x0C, 0x05]).then(|| r[11] == 0x01)
}

/// Fresh reply to `BATTERY`: [9] state (3 draining, 5 charging, 6 full), [11..13] mV.
fn parse_battery(r: &[u8]) -> Option<Reading> {
    if r.len() < 13 || r[..3] != [0xFF, 0x12, 0x05] {
        return None;
    }
    let mv = u16::from_le_bytes([r[11], r[12]]);
    let (percent, charging) = match r[9] {
        0x03 => (from_mv(mv, &DISCHARGING_MV), false),
        0x05 => (from_mv(mv, &CHARGING_MV), true),
        0x06 => (100, true),
        _ => return None,
    };
    Some(Reading { percent, charging })
}

/// Linear between the curve points (10 % apart), clamped to 0..=100.
fn from_mv(mv: u16, curve: &[u16; 11]) -> u8 {
    if mv >= curve[0] {
        return 100;
    }
    for (i, pair) in curve.windows(2).enumerate() {
        let (hi, lo) = (pair[0], pair[1]);
        if mv >= lo {
            let top = 100 - 10 * i as u32;
            let frac = u32::from(mv - lo) * 10 / u32::from(hi - lo);
            return (top - 10 + frac) as u8;
        }
    }
    0
}

/// None when the headset is off or the dongle does not answer.
#[cfg(windows)]
pub fn query(dev: &super::hid::Device, len: usize) -> Option<Reading> {
    if !ask(dev, len, &CONNECTION, parse_connection)? {
        return None;
    }
    ask(dev, len, &BATTERY, parse_battery)
}

#[cfg(windows)]
fn ask<T>(
    dev: &super::hid::Device,
    len: usize,
    cmd: &[u8],
    parse: fn(&[u8]) -> Option<T>,
) -> Option<T> {
    use std::time::{Duration, Instant};
    let mut req = vec![0u8; len];
    req[..cmd.len()].copy_from_slice(cmd);
    if !dev.set_feature(&req) {
        return None;
    }
    let start = Instant::now();
    let mut buf = vec![0u8; len];
    while start.elapsed() < Duration::from_millis(500) {
        // No sleep: a reply stays readable for ~10 ms and a Windows sleep(5) can take
        // 15; each GetFeature is a ~1 ms USB round trip anyway.
        buf.fill(0);
        buf[0] = 0xFF;
        if dev.get_feature(&mut buf)
            && let Some(v) = parse(&buf)
        {
            return Some(v);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hex(s: &str) -> Vec<u8> {
        s.split(' ')
            .map(|b| u8::from_str_radix(b, 16).unwrap())
            .collect()
    }

    #[test]
    fn reads_a_real_battery_reply() {
        // Captured on a 170B: draining at 3802 mV.
        let r = hex("FF 12 05 FE 0C 04 1F 0B 01 03 05 DA 0E 00 00 03 68 10 00 00");
        assert_eq!(
            parse_battery(&r),
            Some(Reading {
                percent: 53,
                charging: false
            })
        );
    }

    #[test]
    fn ignores_stale_replies() {
        let stale = hex("FF 01 00 FE 0C 04 1F 0B 01 03 05 DA 0E 00 00 03 68 10 00 00");
        assert_eq!(parse_battery(&stale), None);
        assert_eq!(parse_connection(&stale), None);
    }

    #[test]
    fn connection_on_and_off() {
        let on = hex("FF 0C 05 FE 00 04 0F 05 82 00 FD 01 00 00");
        assert_eq!(parse_connection(&on), Some(true));
        let mut off = on.clone();
        off[11] = 0x03;
        assert_eq!(parse_connection(&off), Some(false));
    }

    #[test]
    fn full_and_charging_states() {
        let mut r = hex("FF 12 05 FE 0C 04 1F 0B 01 06 05 00 10 00 00");
        assert_eq!(
            parse_battery(&r).map(|x| (x.percent, x.charging)),
            Some((100, true))
        );
        r[9] = 0x05;
        assert!(parse_battery(&r).is_some_and(|x| x.charging));
        r[9] = 0x09;
        assert_eq!(parse_battery(&r), None);
    }

    #[test]
    fn voltage_curve_is_clamped_and_monotonic() {
        assert_eq!(from_mv(4300, &DISCHARGING_MV), 100);
        assert_eq!(from_mv(3000, &DISCHARGING_MV), 0);
        assert_eq!(from_mv(3838, &DISCHARGING_MV), 60);
        let mut last = 0;
        for mv in 3400..4200 {
            let p = from_mv(mv, &DISCHARGING_MV);
            assert!(p >= last);
            last = p;
        }
    }
}
