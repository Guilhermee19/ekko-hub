use ekko_core::AppearanceSettings;
use tauri::{AppHandle, Manager};

use super::settings::broadcast;
use crate::state::AppState;

/// Every window repaints from the broadcast; no window is created here, so it stays sync.
#[tauri::command]
pub fn set_appearance(app: AppHandle, appearance: AppearanceSettings) {
    let settings = app
        .state::<AppState>()
        .update(|s| s.appearance = appearance.sanitized());
    broadcast(&app, &settings);
}
