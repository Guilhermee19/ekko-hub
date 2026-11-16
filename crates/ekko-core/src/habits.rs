//! Water and daily habits. Pure: the caller passes the local "day key"
//! (`clock::day_key`), so the midnight rollover is testable.

use serde::{Deserialize, Serialize};

/// Days kept in each habit's history (the last one is today).
pub const WEEK: usize = 7;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitIcon {
    Book,
    Dumbbell,
    Eye,
    Stretch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitUnit {
    Min,
    X,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Habit {
    pub id: String,
    pub label: String,
    pub icon: HabitIcon,
    pub unit: HabitUnit,
    /// Daily goal.
    pub target: u32,
    /// Today's progress, same unit as target.
    pub progress: u32,
    /// Added per check-in.
    pub step: u32,
    /// Last `WEEK` days, oldest first; the last entry is today.
    pub week: Vec<bool>,
}

impl Habit {
    fn new(
        id: &str,
        label: &str,
        icon: HabitIcon,
        unit: HabitUnit,
        target: u32,
        step: u32,
    ) -> Self {
        Self {
            id: id.to_owned(),
            label: label.to_owned(),
            icon,
            unit,
            target,
            progress: 0,
            step,
            week: vec![false; WEEK],
        }
    }

    /// Sets today's progress (clamped) and keeps today's history entry in sync.
    fn set_progress(&mut self, progress: u32) -> bool {
        let p = progress.min(self.target);
        let changed = p != self.progress;
        self.progress = p;
        if let Some(today) = self.week.last_mut() {
            *today = p >= self.target;
        }
        changed
    }

    fn roll(&mut self, days: usize) {
        for _ in 0..days.min(WEEK) {
            self.week.remove(0);
            self.week.push(false);
        }
        self.week.resize(WEEK, false);
        self.progress = 0;
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Water {
    pub count: u32,
    pub goal: u32,
}

/// What every window renders.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitsSnapshot {
    pub water: Water,
    pub habits: Vec<Habit>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Habits {
    /// Local day the progress belongs to (0 = never rolled).
    pub day: i64,
    pub water: Water,
    pub habits: Vec<Habit>,
}

impl Default for Habits {
    fn default() -> Self {
        use HabitIcon::*;
        use HabitUnit::*;
        Self {
            day: 0,
            water: Water { count: 0, goal: 8 },
            habits: vec![
                Habit::new("reading", "Leitura", Book, Min, 20, 10),
                Habit::new("exercise", "Exercício", Dumbbell, Min, 30, 15),
                Habit::new("eyes", "Pausas para os olhos", Eye, X, 6, 1),
                Habit::new("stretch", "Alongar", Stretch, X, 3, 1),
            ],
        }
    }
}

impl Habits {
    pub fn snapshot(&self) -> HabitsSnapshot {
        HabitsSnapshot {
            water: self.water,
            habits: self.habits.clone(),
        }
    }

    /// Starts a new day: water and progress reset, history shifts. False when `day`
    /// is not after the stored one (same day, or the clock went back).
    pub fn roll_to(&mut self, day: i64) -> bool {
        if day <= self.day {
            return false;
        }
        let days = if self.day == 0 {
            WEEK
        } else {
            (day - self.day) as usize
        };
        self.day = day;
        self.water.count = 0;
        self.habits.iter_mut().for_each(|h| h.roll(days));
        true
    }

    /// Cups are clamped to `[0, goal * 2]`.
    pub fn set_water(&mut self, count: u32) -> bool {
        let count = count.min(self.water.goal * 2);
        let changed = count != self.water.count;
        self.water.count = count;
        changed
    }

    pub fn add_water(&mut self, delta: i32) -> bool {
        self.set_water(self.water.count.saturating_add_signed(delta))
    }

    fn find(&mut self, id: &str) -> Option<&mut Habit> {
        self.habits.iter_mut().find(|h| h.id == id)
    }

    pub fn check_in(&mut self, id: &str) -> bool {
        self.find(id)
            .is_some_and(|h| h.set_progress(h.progress + h.step))
    }

    pub fn undo(&mut self, id: &str) -> bool {
        self.find(id)
            .is_some_and(|h| h.set_progress(h.progress.saturating_sub(h.step)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAY: i64 = 20_407;

    fn reading(hs: &Habits) -> &Habit {
        &hs.habits[0]
    }

    #[test]
    fn defaults_start_empty() {
        let hs = Habits::default();
        assert_eq!(hs.water, Water { count: 0, goal: 8 });
        assert_eq!(hs.habits.len(), 4);
        assert!(
            hs.habits
                .iter()
                .all(|h| h.progress == 0 && h.week == [false; WEEK])
        );
    }

    #[test]
    fn check_in_clamps_and_marks_today() {
        let mut hs = Habits::default();
        assert!(hs.check_in("reading"));
        assert!(!reading(&hs).week[WEEK - 1]);
        assert!(hs.check_in("reading"));
        assert_eq!(reading(&hs).progress, 20);
        assert!(reading(&hs).week[WEEK - 1]);
        assert!(!hs.check_in("reading"));
        assert!(hs.undo("reading"));
        assert!(!reading(&hs).week[WEEK - 1]);
        assert!(!hs.check_in("nope"));
    }

    #[test]
    fn water_is_clamped() {
        let mut hs = Habits::default();
        assert!(!hs.add_water(-1));
        assert!(hs.set_water(99));
        assert_eq!(hs.water.count, 16);
        assert!(hs.add_water(-2));
        assert_eq!(hs.water.count, 14);
    }

    #[test]
    fn rollover_resets_today_and_shifts_history() {
        let mut hs = Habits::default();
        assert!(hs.roll_to(DAY));
        hs.set_water(5);
        hs.check_in("stretch");
        hs.check_in("stretch");
        hs.check_in("stretch");
        assert!(!hs.roll_to(DAY));
        assert!(!hs.roll_to(DAY - 1));
        assert!(hs.roll_to(DAY + 1));
        assert_eq!(hs.water.count, 0);
        let stretch = &hs.habits[3];
        assert_eq!(stretch.progress, 0);
        assert_eq!(
            stretch.week,
            [false, false, false, false, false, true, false]
        );
        hs.roll_to(DAY + 3);
        assert!(hs.habits[3].week[3]);
        hs.roll_to(DAY + 100);
        assert_eq!(hs.habits[3].week, [false; WEEK]);
    }

    #[test]
    fn serializes_camel_case() {
        let json = serde_json::to_value(Habits::default().snapshot()).unwrap();
        assert_eq!(json["water"]["goal"], 8);
        assert_eq!(json["habits"][1]["icon"], "dumbbell");
        assert_eq!(json["habits"][2]["unit"], "x");
    }
}
