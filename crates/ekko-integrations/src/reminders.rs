//! When to nudge about calendar events: once ~10 min before and once at start.

use std::collections::HashSet;

use serde::Serialize;

use crate::google_calendar::CalendarEvent;

pub const SOON_MS: i64 = 10 * 60_000;
/// Late ticks (sleep, slow fetch) still announce a start this long after it.
const START_GRACE_MS: i64 = 2 * 60_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Soon,
    Start,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub event: CalendarEvent,
    pub phase: Phase,
    /// Rounded up; 0 at start.
    pub minutes_left: i64,
}

#[derive(Default)]
pub struct Reminders {
    /// (event id, start) so a rescheduled event is announced again.
    sent: HashSet<(String, i64, Phase)>,
}

impl Reminders {
    pub fn due(&mut self, events: &[CalendarEvent], now_ms: i64) -> Vec<Reminder> {
        self.sent
            .retain(|(_, start, _)| *start > now_ms - 3_600_000);
        let mut out = Vec::new();
        for event in events.iter().filter(|e| !e.all_day) {
            let until = event.start_ms - now_ms;
            let phase = if (-START_GRACE_MS..=0).contains(&until) {
                Phase::Start
            } else if (1..=SOON_MS).contains(&until) {
                Phase::Soon
            } else {
                continue;
            };
            if self.sent.insert((event.id.clone(), event.start_ms, phase)) {
                let minutes_left = (until.max(0) + 59_999) / 60_000;
                out.push(Reminder {
                    event: event.clone(),
                    phase,
                    minutes_left,
                });
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn announces_soon_then_start_once_each() {
        let mut r = Reminders::default();
        let events = [event("a", 20 * 60_000, false)];
        assert!(r.due(&events, 0).is_empty(), "20 min away");
        let soon = r.due(&events, 11 * 60_000);
        assert_eq!((soon[0].phase, soon[0].minutes_left), (Phase::Soon, 9));
        assert!(r.due(&events, 12 * 60_000).is_empty(), "no repeat");
        let start = r.due(&events, 20 * 60_000 + 30_000);
        assert_eq!((start[0].phase, start[0].minutes_left), (Phase::Start, 0));
        assert!(r.due(&events, 21 * 60_000).is_empty());
    }

    #[test]
    fn skips_all_day_and_long_past_events() {
        let mut r = Reminders::default();
        let events = [event("day", 60_000, true), event("past", 0, false)];
        assert!(r.due(&events, 5 * 60_000).is_empty());
    }

    #[test]
    fn rescheduled_event_is_announced_again() {
        let mut r = Reminders::default();
        assert_eq!(r.due(&[event("a", 5 * 60_000, false)], 0).len(), 1);
        assert_eq!(r.due(&[event("a", 8 * 60_000, false)], 0).len(), 1);
    }
}
