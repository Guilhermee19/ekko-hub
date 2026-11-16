//! Timers run here, not in a webview: they keep going with every window closed and
//! fire the alarm window when they end. Every window mirrors `TIMERS_CHANGED`.

use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ekko_core::pomodoro::PomodoroPhase;
use ekko_core::timers::{Timer, Timers, TimersSnapshot};
use serde_json::{Value, json};
use tauri::{AppHandle, Emitter, Manager};

use crate::display;
use crate::state::AppState;

/// Full `TimersSnapshot` after every change.
pub const TIMERS_CHANGED: &str = "ekko://timers/changed";
/// Entry for the notification center (`{ kind, title, body }`).
pub const NOTIFY_EVENT: &str = "ekko://notify";
const TICK: Duration = Duration::from_millis(250);

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64)
}

/// Runs `change` on the timers and broadcasts the result when it returns true.
pub fn mutate(app: &AppHandle, change: impl FnOnce(&mut Timers, u64) -> bool) -> TimersSnapshot {
    let (changed, snapshot) = {
        let state = app.state::<AppState>();
        let mut timers = state.timers();
        let changed = change(&mut timers, now_ms());
        (changed, timers.snapshot())
    };
    if changed {
        let _ = app.emit(TIMERS_CHANGED, &snapshot);
    }
    snapshot
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        loop {
            thread::sleep(TICK);
            tick(&app);
        }
    });
}

struct Fired {
    id: String,
    title: String,
    detail: String,
}

fn tick(app: &AppHandle) {
    let mut fired = Vec::new();
    mutate(app, |timers, now| {
        fired.extend(timers.due(now).iter().map(timer_fired));
        if let Some(phase) = timers.pomodoro.due(now) {
            fired.push(pomodoro_fired(phase, timers.pomodoro.break_min, now));
        }
        !fired.is_empty()
    });
    // The lock is released: showing a window may take a while.
    for f in fired {
        let now = now_ms();
        let _ = app.emit(
            NOTIFY_EVENT,
            json!({ "kind": "timer", "title": f.title, "body": f.detail }),
        );
        let alarm: Value = json!({
            "id": f.id,
            "kind": "timer",
            "title": f.title,
            "detail": f.detail,
            "firedAt": now,
        });
        if let Err(err) = display::flows::show_alarm(app, alarm) {
            eprintln!("[ekko] falha ao mostrar alarme: {err}");
        }
    }
}

fn timer_fired(t: &Timer) -> Fired {
    Fired {
        id: t.id.clone(),
        title: t.label.clone(),
        detail: format!("Timer de {}", human(t.total_ms / 1000)),
    }
}

fn pomodoro_fired(ended: PomodoroPhase, break_min: u32, now: u64) -> Fired {
    let (title, detail) = match ended {
        PomodoroPhase::Focus => (
            "Foco concluído",
            format!("Hora da pausa de {break_min} min"),
        ),
        PomodoroPhase::Break => ("Pausa terminou", "Bora voltar ao foco".to_owned()),
    };
    Fired {
        id: format!("pomo-{now:x}"),
        title: title.to_owned(),
        detail,
    }
}

/// "45 s", "5 min", "1 h 30 min" (same as the frontend's `formatDuration`).
fn human(seconds: u64) -> String {
    if seconds < 60 {
        return format!("{seconds} s");
    }
    let m = (seconds + 30) / 60;
    match (m / 60, m % 60) {
        (0, m) => format!("{m} min"),
        (h, 0) => format!("{h} h"),
        (h, m) => format!("{h} h {m} min"),
    }
}

#[cfg(test)]
mod tests {
    use super::human;

    #[test]
    fn human_durations() {
        assert_eq!(human(45), "45 s");
        assert_eq!(human(300), "5 min");
        assert_eq!(human(5400), "1 h 30 min");
        assert_eq!(human(7200), "2 h");
    }
}
