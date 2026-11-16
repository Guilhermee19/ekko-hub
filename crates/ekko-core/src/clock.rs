//! Pure local-time math. The caller passes the local UTC offset (ms), so this stays
//! testable and free of time-zone lookups.

pub const DAY_MS: i64 = 86_400_000;

/// Days since the epoch in local time: changes exactly at local midnight.
pub fn day_key(now_ms: u64, offset_ms: i64) -> i64 {
    (now_ms as i64 + offset_ms).div_euclid(DAY_MS)
}

/// Local "HH:MM" of an epoch-ms instant.
pub fn clock_label(at_ms: u64, offset_ms: i64) -> String {
    let minutes = (at_ms as i64 + offset_ms).rem_euclid(DAY_MS) / 60_000;
    format!("{:02}:{:02}", minutes / 60, minutes % 60)
}

/// Same local time `months` later; the day is clamped (31 Jan + 1 → 28/29 Feb).
pub fn add_months(at_ms: u64, months: u32, offset_ms: i64) -> u64 {
    let local = at_ms as i64 + offset_ms;
    let (days, time) = (local.div_euclid(DAY_MS), local.rem_euclid(DAY_MS));
    let (y, m, d) = civil_from_days(days);
    let total = y * 12 + (m as i64 - 1) + months as i64;
    let (ny, nm) = (total.div_euclid(12), total.rem_euclid(12) as u32 + 1);
    let nd = d.min(days_in_month(ny, nm));
    let local = days_from_civil(ny, nm, nd) * DAY_MS + time;
    (local - offset_ms).max(0) as u64
}

fn days_in_month(y: i64, m: u32) -> u32 {
    match m {
        2 if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

// Howard Hinnant's civil calendar algorithms (proleptic Gregorian).
fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m as i64 + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    const BRT: i64 = -3 * 3_600_000;
    /// 2026-11-15 10:00 BRT (13:00 UTC).
    const NOV15: u64 = 1_794_747_600_000;

    #[test]
    fn civil_round_trips() {
        for days in [-1_000_000, -1, 0, 1, 19_000, 20_407, 1_000_000] {
            let (y, m, d) = civil_from_days(days);
            assert_eq!(days_from_civil(y, m, d), days);
        }
        assert_eq!(civil_from_days(0), (1970, 1, 1));
    }

    #[test]
    fn day_key_flips_at_local_midnight() {
        let midnight = NOV15 + 14 * 3_600_000; // 2026-11-16 00:00 BRT
        assert_eq!(day_key(midnight - 1, BRT) + 1, day_key(midnight, BRT));
        assert_eq!(clock_label(NOV15, BRT), "10:00");
        assert_eq!(clock_label(midnight, BRT), "00:00");
    }

    #[test]
    fn add_months_keeps_local_time_and_clamps_day() {
        let next = add_months(NOV15, 1, BRT);
        assert_eq!(next - NOV15, 30 * DAY_MS as u64);
        assert_eq!(clock_label(next, BRT), "10:00");
        // 2027-01-31 10:00 BRT → 2027-02-28.
        let jan31 = NOV15 + 77 * DAY_MS as u64;
        assert_eq!(civil_from_days(day_key(jan31, BRT)), (2027, 1, 31));
        let feb = add_months(jan31, 1, BRT);
        assert_eq!(civil_from_days(day_key(feb, BRT)), (2027, 2, 28));
    }
}
