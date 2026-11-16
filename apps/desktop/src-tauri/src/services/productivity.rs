//! Tasks, reminders, water and habits live here (one copy for every window) and are
//! saved to `productivity.json` after each change. A 1 s ticker fires due reminders
//! (notification + alarm window) and rolls water/habits over at local midnight.

use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::Duration;

use chrono::{Local, Offset};
use ekko_core::clock::{clock_label, day_key};
use ekko_core::habits::{Habits, HabitsSnapshot};
use ekko_core::productivity::{Productivity, ProductivityStore};
use ekko_core::tasks::{Reminder, Tasks, TasksSnapshot};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use crate::display;
use crate::services::timers::{NOTIFY_EVENT, now_ms};

/// Full `TasksSnapshot` after every change.
pub const TASKS_CHANGED: &str = "ekko://tasks/changed";
/// Full `HabitsSnapshot` after every change.
pub const HABITS_CHANGED: &str = "ekko://habits/changed";
const TICK: Duration = Duration::from_secs(1);

pub struct ProductivityService {
    data: Mutex<Productivity>,
    store: ProductivityStore,
}

impl ProductivityService {
    /// Keep the guard short: never show a window while holding it.
    pub fn data(&self) -> MutexGuard<'_, Productivity> {
        self.data.lock().expect("productivity lock")
    }

    fn save(&self, data: &Productivity) {
        if let Err(err) = self.store.save(data) {
            eprintln!("[ekko] falha ao salvar produtividade: {err}");
        }
    }
}

/// Local UTC offset right now (DST-aware enough for day keys and monthly repeats).
pub fn local_offset_ms() -> i64 {
    i64::from(Local::now().offset().fix().local_minus_utc()) * 1000
}

pub fn init(app: &AppHandle) {
    let dir = app.path().app_data_dir().unwrap_or_default();
    let store = ProductivityStore::new(&dir);
    let mut data = store.load().unwrap_or_else(|err| {
        eprintln!(
            "[ekko] {} ilegível, começando do zero: {err}",
            store.path().display()
        );
        Productivity::default()
    });
    data.habits.roll_to(day_key(now_ms(), local_offset_ms()));
    app.manage(ProductivityService {
        data: Mutex::new(data),
        store,
    });
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-productivity".into())
        .spawn(move || {
            loop {
                tick(&app);
                thread::sleep(TICK);
            }
        });
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar lembretes: {err}");
    }
}

/// Runs `change` on the tasks; when it returns true, saves and broadcasts.
pub fn mutate_tasks(
    app: &AppHandle,
    change: impl FnOnce(&mut Tasks, u64, i64) -> bool,
) -> TasksSnapshot {
    let service = app.state::<ProductivityService>();
    let (changed, snapshot) = {
        let mut data = service.data();
        let changed = change(&mut data.tasks, now_ms(), local_offset_ms());
        if changed {
            service.save(&data);
        }
        (changed, data.tasks.snapshot())
    };
    if changed {
        let _ = app.emit(TASKS_CHANGED, &snapshot);
    }
    snapshot
}

/// Same as `mutate_tasks`, for water and habits (rolled to today first).
pub fn mutate_habits(app: &AppHandle, change: impl FnOnce(&mut Habits) -> bool) -> HabitsSnapshot {
    let service = app.state::<ProductivityService>();
    let (changed, snapshot) = {
        let mut data = service.data();
        let rolled = data.habits.roll_to(day_key(now_ms(), local_offset_ms()));
        let changed = change(&mut data.habits) | rolled;
        if changed {
            service.save(&data);
        }
        (changed, data.habits.snapshot())
    };
    if changed {
        let _ = app.emit(HABITS_CHANGED, &snapshot);
    }
    snapshot
}

fn tick(app: &AppHandle) {
    let offset = local_offset_ms();
    let mut fired = Vec::new();
    mutate_tasks(app, |tasks, now, offset| {
        fired = tasks.take_due(now, offset);
        !fired.is_empty()
    });
    mutate_habits(app, |_| false);
    // The lock is released: showing a window may take a while.
    for reminder in fired {
        fire(app, &reminder, offset);
    }
}

fn fire(app: &AppHandle, reminder: &Reminder, offset: i64) {
    let now = now_ms();
    let detail = format!("Lembrete das {}", clock_label(reminder.at_ms, offset));
    let _ = app.emit(
        NOTIFY_EVENT,
        json!({ "kind": "reminder", "title": reminder.text, "body": detail }),
    );
    let alarm = json!({
        "id": format!("{}-{now:x}", reminder.id),
        "kind": "reminder",
        "title": reminder.text,
        "detail": detail,
        "firedAt": now,
    });
    if let Err(err) = display::flows::show_alarm(app, alarm) {
        eprintln!("[ekko] falha ao mostrar lembrete: {err}");
    }
}
