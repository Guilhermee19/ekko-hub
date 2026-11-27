//! Which forecast hours are worth a warning, and warning once per rainy spell.

use serde::Serialize;

use super::Hour;

const HOUR_MS: i64 = 3_600_000;
/// Below this chance of rain the hour is ignored, whatever the model's code says.
const MIN_PROBABILITY: u8 = 50;
/// mm in one hour that count as heavy rain even without a heavy-rain code.
const HEAVY_MM: f64 = 8.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Severity {
    HeavyRain,
    Storm,
}

/// A run of consecutive risky hours.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RainAlert {
    /// The worst hour of the run.
    pub severity: Severity,
    pub start_ms: i64,
    /// End of the last risky hour.
    pub end_ms: i64,
    /// Total over the run.
    pub precip_mm: f64,
    pub probability: Option<u8>,
    pub gust_kmh: f64,
}

/// WMO codes: 95 thunderstorm, 96/99 with hail; 65 heavy rain, 67 heavy freezing rain,
/// 82 violent showers.
pub fn severity(h: &Hour) -> Option<Severity> {
    if h.probability.is_some_and(|p| p < MIN_PROBABILITY) {
        return None;
    }
    match h.code {
        95 | 96 | 99 => Some(Severity::Storm),
        65 | 67 | 82 => Some(Severity::HeavyRain),
        _ if h.precip_mm >= HEAVY_MM => Some(Severity::HeavyRain),
        _ => None,
    }
}

/// The first run of hours at least as bad as `min` that starts within `within_ms`
/// (an hour already under way counts).
pub fn next_episode(
    hours: &[Hour],
    now_ms: i64,
    within_ms: i64,
    min: Severity,
) -> Option<RainAlert> {
    let risky = |h: &Hour| severity(h).filter(|s| *s >= min);
    let first = hours.iter().position(|h| {
        h.time_ms + HOUR_MS > now_ms && h.time_ms <= now_ms + within_ms && risky(h).is_some()
    })?;
    let run: Vec<(&Hour, Severity)> = hours[first..]
        .iter()
        .map_while(|h| risky(h).map(|s| (h, s)))
        .collect();
    let (start, _) = run.first()?;
    let (last, _) = run.last()?;
    Some(RainAlert {
        severity: run.iter().map(|(_, s)| *s).max()?,
        start_ms: start.time_ms,
        end_ms: last.time_ms + HOUR_MS,
        precip_mm: run.iter().map(|(h, _)| h.precip_mm).sum(),
        probability: run.iter().filter_map(|(h, _)| h.probability).max(),
        gust_kmh: run.iter().map(|(h, _)| h.gust_kmh).fold(0.0, f64::max),
    })
}

/// Remembers the spell already announced so a new forecast every 30 min doesn't repeat it.
#[derive(Debug, Default)]
pub struct Watch {
    until_ms: Option<i64>,
}

impl Watch {
    /// True when `alert` is a new spell (it starts after the last announced one ended).
    pub fn is_new(&mut self, alert: &RainAlert) -> bool {
        match self.until_ms {
            Some(until) if alert.start_ms < until => {
                self.until_ms = Some(until.max(alert.end_ms));
                false
            }
            _ => {
                self.until_ms = Some(alert.end_ms);
                true
            }
        }
    }

    /// Another city: start over.
    pub fn reset(&mut self) {
        self.until_ms = None;
    }
}
