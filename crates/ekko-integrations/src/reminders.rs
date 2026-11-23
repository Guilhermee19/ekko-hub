//! When to nudge about calendar events: some minutes before, at the start and, while
//! nobody confirmed it, a few more times after. A confirmed event goes quiet.

use std::collections::HashSet;

use serde::Serialize;

use crate::google_calendar::CalendarEvent;

/// Late ticks (sleep, slow fetch) still announce a moment this long after it.
const GRACE_MS: i64 = 2 * 60_000;
const DAY_MS: i64 = 24 * 3_600_000;
const MIN_MS: i64 = 60_000;

/// When to nudge, from the user's settings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Schedule {
    /// Warning before the start (0 = none).
    pub before_min: u32,
    /// Extra nudges after the start while nobody confirmed the event.
    pub repeats: u32,
    /// Gap between those extra nudges.
    pub every_min: u32,
}

impl Default for Schedule {
    fn default() -> Self {
        Self {
            before_min: 5,
            repeats: 1,
            every_min: 5,
        }
    }
}

impl Schedule {
    /// Which nudge `until` (start - now) falls on: -1 before, 0 start, k the k-th repeat.
    fn slot(&self, until: i64) -> Option<(i64, Phase)> {
        if until > 0 {
            let before = i64::from(self.before_min) * MIN_MS;
            return (until <= before).then_some((-1, Phase::Soon));
        }
        if until >= -GRACE_MS {
            return Some((0, Phase::Start));
        }
        let every = i64::from(self.every_min.max(1)) * MIN_MS;
        let k = -until / every;
        let in_window = k >= 1 && k <= i64::from(self.repeats) && -until - k * every <= GRACE_MS;
        in_window.then_some((k, Phase::Late))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Soon,
    Start,
    Late,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub event: CalendarEvent,
    pub phase: Phase,
    /// Rounded up; 0 at start, negative once it started (-5 = 5 min late).
    pub minutes_left: i64,
}

/// An event the user marked as seen (the start pins the occurrence).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Ack {
    pub id: String,
    pub start_ms: i64,
}

#[derive(Default)]
pub struct Reminders {
    /// (event id, start, slot) so a rescheduled event is announced again.
    sent: HashSet<(String, i64, i64)>,
    acked: HashSet<Ack>,
}

impl Reminders {
    pub fn due(&mut self, events: &[CalendarEvent], now_ms: i64, plan: Schedule) -> Vec<Reminder> {
        self.sent.retain(|(_, start, _)| *start > now_ms - DAY_MS);
        self.acked.retain(|a| a.start_ms > now_ms - DAY_MS);
        let mut out = Vec::new();
        for event in events.iter().filter(|e| !e.all_day && e.end_ms > now_ms) {
            if self.is_acked(&event.id, event.start_ms) {
                continue;
            }
            let until = event.start_ms - now_ms;
            let Some((slot, phase)) = plan.slot(until) else {
                continue;
            };
            if self.sent.insert((event.id.clone(), event.start_ms, slot)) {
                let minutes_left = if until >= 0 {
                    (until + 59_999) / MIN_MS
                } else {
                    until / MIN_MS
                };
                out.push(Reminder {
                    event: event.clone(),
                    phase,
                    minutes_left,
                });
            }
        }
        out
    }

    /// Marks the occurrence as seen. False when it already was.
    pub fn ack(&mut self, id: String, start_ms: i64) -> bool {
        self.acked.insert(Ack { id, start_ms })
    }

    pub fn is_acked(&self, id: &str, start_ms: i64) -> bool {
        self.acked
            .iter()
            .any(|a| a.id == id && a.start_ms == start_ms)
    }

    pub fn acked(&self) -> Vec<Ack> {
        self.acked.iter().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MIN: i64 = 60_000;
    const PLAN: Schedule = Schedule {
        before_min: 5,
        repeats: 1,
        every_min: 5,
    };

    fn event(id: &str, start_ms: i64, all_day: bool) -> CalendarEvent {
        CalendarEvent {
            id: id.into(),
            title: id.into(),
            start_ms,
            end_ms: start_ms + 3_600_000,
            all_day,
            location: None,
            meet_link: None,
            calendar_name: "Agenda".into(),
        }
    }

    fn phases(
        r: &mut Reminders,
        events: &[CalendarEvent],
        now: i64,
        plan: Schedule,
    ) -> Vec<(Phase, i64)> {
        r.due(events, now, plan)
            .iter()
            .map(|x| (x.phase, x.minutes_left))
            .collect()
    }

    #[test]
    fn announces_soon_start_and_late_once_each() {
        let mut r = Reminders::default();
        let ev = [event("a", 20 * MIN, false)];
        assert!(r.due(&ev, 0, PLAN).is_empty(), "20 min away");
        assert!(r.due(&ev, 14 * MIN, PLAN).is_empty(), "6 min away");
        assert_eq!(phases(&mut r, &ev, 16 * MIN, PLAN), [(Phase::Soon, 4)]);
        assert!(r.due(&ev, 17 * MIN, PLAN).is_empty(), "no repeat");
        assert_eq!(
            phases(&mut r, &ev, 20 * MIN + 30_000, PLAN),
            [(Phase::Start, 0)]
        );
        assert!(r.due(&ev, 22 * MIN, PLAN).is_empty());
        assert_eq!(
            phases(&mut r, &ev, 25 * MIN + 10_000, PLAN),
            [(Phase::Late, -5)]
        );
        assert!(r.due(&ev, 26 * MIN, PLAN).is_empty());
        assert!(r.due(&ev, 30 * MIN, PLAN).is_empty(), "only one repeat");
    }

    #[test]
    fn custom_schedule_repeats_and_lead() {
        let plan = Schedule {
            before_min: 15,
            repeats: 3,
            every_min: 10,
        };
        let mut r = Reminders::default();
        let ev = [event("a", 60 * MIN, false)];
        assert_eq!(phases(&mut r, &ev, 46 * MIN, plan), [(Phase::Soon, 14)]);
        assert_eq!(phases(&mut r, &ev, 60 * MIN, plan), [(Phase::Start, 0)]);
        assert!(r.due(&ev, 65 * MIN, plan).is_empty(), "not every 5 min");
        for k in 1..=3 {
            let at = 60 * MIN + k * 10 * MIN;
            assert_eq!(phases(&mut r, &ev, at, plan), [(Phase::Late, -k * 10)]);
        }
        assert!(r.due(&ev, 100 * MIN, plan).is_empty(), "stops after 3");
    }

    #[test]
    fn no_warning_before_when_zero() {
        let plan = Schedule {
            before_min: 0,
            ..PLAN
        };
        let mut r = Reminders::default();
        assert!(r.due(&[event("a", MIN, false)], 0, plan).is_empty());
    }

    #[test]
    fn confirmed_event_goes_quiet() {
        let mut r = Reminders::default();
        let ev = [event("a", 20 * MIN, false)];
        assert_eq!(r.due(&ev, 16 * MIN, PLAN).len(), 1);
        assert!(r.ack("a".into(), 20 * MIN));
        assert!(!r.ack("a".into(), 20 * MIN), "already confirmed");
        assert!(r.due(&ev, 20 * MIN, PLAN).is_empty(), "no start nudge");
        assert!(r.due(&ev, 25 * MIN, PLAN).is_empty(), "no late nudge");
        assert_eq!(r.acked().len(), 1);
        // Same id at another time (recurring or moved) still nudges.
        assert_eq!(
            r.due(&[event("a", 24 * MIN, false)], 24 * MIN, PLAN).len(),
            1
        );
    }

    #[test]
    fn skips_all_day_and_long_past_events() {
        let mut r = Reminders::default();
        let ev = [event("day", MIN, true), event("past", 0, false)];
        assert!(r.due(&ev, 12 * MIN, PLAN).is_empty());
    }

    #[test]
    fn rescheduled_event_is_announced_again() {
        let mut r = Reminders::default();
        assert_eq!(r.due(&[event("a", 3 * MIN, false)], 0, PLAN).len(), 1);
        assert_eq!(r.due(&[event("a", 4 * MIN, false)], 0, PLAN).len(), 1);
    }
}
