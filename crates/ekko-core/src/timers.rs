//! Countdown timers: pure model, the clock (`now`, epoch ms) is always passed in.

use serde::{Deserialize, Serialize};

use crate::pomodoro::Pomodoro;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timer {
    pub id: String,
    pub label: String,
    pub total_ms: u64,
    /// Epoch ms; meaningless while paused.
    pub ends_at_ms: u64,
    /// Ms left when paused, `None` while running.
    pub paused_left_ms: Option<u64>,
}

impl Timer {
    pub fn remaining(&self, now: u64) -> u64 {
        self.paused_left_ms
            .unwrap_or_else(|| self.ends_at_ms.saturating_sub(now))
    }

    pub fn is_paused(&self) -> bool {
        self.paused_left_ms.is_some()
    }
}

/// What every window renders: sent on each change.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimersSnapshot {
    pub timers: Vec<Timer>,
    pub pomodoro: Pomodoro,
}

#[derive(Debug, Clone, Default)]
pub struct Timers {
    timers: Vec<Timer>,
    pub pomodoro: Pomodoro,
    seq: u64,
}

impl Timers {
    pub fn snapshot(&self) -> TimersSnapshot {
        TimersSnapshot {
            timers: self.timers.clone(),
            pomodoro: self.pomodoro.clone(),
        }
    }

    pub fn list(&self) -> &[Timer] {
        &self.timers
    }

    /// Starts a countdown; newest first. Returns its id.
    pub fn add(&mut self, label: &str, seconds: u64, now: u64) -> String {
        self.seq += 1;
        let id = format!("tm-{now:x}-{}", self.seq);
        let label = match label.trim() {
            "" => "Timer".to_owned(),
            l => l.to_owned(),
        };
        let total_ms = seconds.max(1) * 1000;
        self.timers.insert(
            0,
            Timer {
                id: id.clone(),
                label,
                total_ms,
                ends_at_ms: now + total_ms,
                paused_left_ms: None,
            },
        );
        id
    }

    fn find(&mut self, id: &str) -> Option<&mut Timer> {
        self.timers.iter_mut().find(|t| t.id == id)
    }

    /// False when the id is unknown or already paused.
    pub fn pause(&mut self, id: &str, now: u64) -> bool {
        match self.find(id) {
            Some(t) if !t.is_paused() => {
                t.paused_left_ms = Some(t.ends_at_ms.saturating_sub(now));
                true
            }
            _ => false,
        }
    }

    pub fn resume(&mut self, id: &str, now: u64) -> bool {
        match self.find(id) {
            Some(t) => match t.paused_left_ms.take() {
                Some(left) => {
                    t.ends_at_ms = now + left;
                    true
                }
                None => false,
            },
            None => false,
        }
    }

    pub fn cancel(&mut self, id: &str) -> bool {
        let before = self.timers.len();
        self.timers.retain(|t| t.id != id);
        self.timers.len() != before
    }

    /// Adds time to the countdown (and to its total, so progress stays sane).
    pub fn extend(&mut self, id: &str, seconds: u64) -> bool {
        let Some(t) = self.find(id) else { return false };
        let ms = seconds * 1000;
        t.total_ms += ms;
        match t.paused_left_ms.as_mut() {
            Some(left) => *left += ms,
            None => t.ends_at_ms += ms,
        }
        true
    }

    pub fn remaining(&self, id: &str, now: u64) -> Option<u64> {
        self.timers
            .iter()
            .find(|t| t.id == id)
            .map(|t| t.remaining(now))
    }

    /// Removes and returns the running timers that reached zero.
    pub fn due(&mut self, now: u64) -> Vec<Timer> {
        let (done, alive) = std::mem::take(&mut self.timers)
            .into_iter()
            .partition(|t| !t.is_paused() && t.ends_at_ms <= now);
        self.timers = alive;
        done
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const T0: u64 = 1_000_000;

    #[test]
    fn add_then_remaining_counts_down() {
        let mut ts = Timers::default();
        let id = ts.add("  Café ", 60, T0);
        assert_eq!(ts.list()[0].label, "Café");
        assert_eq!(ts.remaining(&id, T0 + 10_000), Some(50_000));
        assert_eq!(ts.remaining(&id, T0 + 99_000), Some(0));
        assert_eq!(ts.add(" ", 1, T0), "tm-f4240-2");
        assert_eq!(ts.list()[0].label, "Timer");
    }

    #[test]
    fn pause_freezes_and_resume_shifts_the_end() {
        let mut ts = Timers::default();
        let id = ts.add("x", 60, T0);
        assert!(ts.pause(&id, T0 + 20_000));
        assert!(!ts.pause(&id, T0 + 20_000));
        assert_eq!(ts.remaining(&id, T0 + 500_000), Some(40_000));
        assert!(ts.due(T0 + 500_000).is_empty());
        assert!(ts.resume(&id, T0 + 500_000));
        assert!(!ts.resume(&id, T0 + 500_000));
        assert_eq!(ts.list()[0].ends_at_ms, T0 + 540_000);
    }

    #[test]
    fn extend_adds_to_end_and_total() {
        let mut ts = Timers::default();
        let id = ts.add("x", 60, T0);
        assert!(ts.extend(&id, 30));
        assert_eq!(ts.remaining(&id, T0), Some(90_000));
        assert_eq!(ts.list()[0].total_ms, 90_000);
        ts.pause(&id, T0);
        ts.extend(&id, 10);
        assert_eq!(ts.remaining(&id, T0), Some(100_000));
        assert!(!ts.extend("nope", 10));
    }

    #[test]
    fn due_removes_only_finished_running_timers() {
        let mut ts = Timers::default();
        let short = ts.add("short", 5, T0);
        let long = ts.add("long", 60, T0);
        assert!(ts.due(T0 + 4_999).is_empty());
        let done = ts.due(T0 + 5_000);
        assert_eq!(done.len(), 1);
        assert_eq!(done[0].id, short);
        assert_eq!(ts.list().len(), 1);
        assert!(ts.cancel(&long));
        assert!(!ts.cancel(&long));
    }

    #[test]
    fn snapshot_is_camel_case() {
        let mut ts = Timers::default();
        ts.add("x", 1, T0);
        let json = serde_json::to_value(ts.snapshot()).unwrap();
        let t = &json["timers"][0];
        assert_eq!(t["totalMs"], 1000);
        assert_eq!(t["endsAtMs"], T0 + 1000);
        assert!(t["pausedLeftMs"].is_null());
        assert_eq!(json["pomodoro"]["phase"], "focus");
    }
}
