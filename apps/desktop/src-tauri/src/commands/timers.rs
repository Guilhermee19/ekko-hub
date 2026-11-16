//! Timer/pomodoro IPC. Each command returns the new snapshot (also broadcast).

use ekko_core::pomodoro::PomodoroAction;
use ekko_core::timers::TimersSnapshot;
use tauri::{AppHandle, Manager};

use crate::services::timers::mutate;
use crate::state::AppState;

#[tauri::command]
pub fn list_timers(app: AppHandle) -> TimersSnapshot {
    app.state::<AppState>().timers().snapshot()
}

#[tauri::command]
pub fn timer_add(app: AppHandle, label: String, seconds: u64) -> TimersSnapshot {
    mutate(&app, |t, now| {
        t.add(&label, seconds, now);
        true
    })
}

#[tauri::command]
pub fn timer_pause(app: AppHandle, id: String) -> TimersSnapshot {
    mutate(&app, |t, now| t.pause(&id, now))
}

#[tauri::command]
pub fn timer_resume(app: AppHandle, id: String) -> TimersSnapshot {
    mutate(&app, |t, now| t.resume(&id, now))
}

#[tauri::command]
pub fn timer_cancel(app: AppHandle, id: String) -> TimersSnapshot {
    mutate(&app, |t, _| t.cancel(&id))
}

#[tauri::command]
pub fn timer_extend(app: AppHandle, id: String, seconds: u64) -> TimersSnapshot {
    mutate(&app, |t, _| t.extend(&id, seconds))
}

/// `action`: "start" | "pause" | "skip" | "reset".
#[tauri::command]
pub fn pomodoro(app: AppHandle, action: PomodoroAction) -> TimersSnapshot {
    mutate(&app, |t, now| t.pomodoro.apply(action, now))
}
