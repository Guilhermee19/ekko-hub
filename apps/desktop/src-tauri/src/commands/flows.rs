use serde_json::Value;
use tauri::{AppHandle, Manager};

use super::settings::broadcast;
use crate::display::{self, windows};
use crate::state::AppState;

#[tauri::command]
pub fn toggle_palette(app: AppHandle) -> Result<(), String> {
    display::flows::toggle_palette(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_onboarding(app: AppHandle) -> Result<(), String> {
    display::flows::show_onboarding(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn finish_onboarding(app: AppHandle) -> Result<(), String> {
    let settings = app.state::<AppState>().update(|s| s.onboarded = true);
    broadcast(&app, &settings);
    if let Some(w) = app.get_webview_window(windows::ONBOARDING) {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn show_alarm(app: AppHandle, alarm: Value) -> Result<(), String> {
    display::flows::show_alarm(&app, alarm).map_err(|e| e.to_string())
}

/// The alarm window asks for the alarm it was opened for (it may miss the event).
#[tauri::command]
pub fn take_alarm(state: tauri::State<'_, AppState>) -> Option<Value> {
    state.take_pending_alarm()
}
