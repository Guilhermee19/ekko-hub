use ekko_core::{DockSide, Persona, Settings};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::display::{self, windows};
use crate::state::AppState;

pub const SETTINGS_CHANGED: &str = "ekko://settings/changed";

/// Every window re-reads settings from this event (e.g. persona repaint).
pub fn broadcast(app: &AppHandle, settings: &Settings) {
    let _ = app.emit(SETTINGS_CHANGED, settings);
}

pub fn open_settings_window(app: &AppHandle) -> tauri::Result<()> {
    let window = windows::ensure(app, windows::SETTINGS)?;
    window.show()?;
    window.unminimize()?;
    window.set_focus()
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings()
}

#[tauri::command]
pub fn set_persona(app: AppHandle, persona: Persona) {
    let settings = app.state::<AppState>().update(|s| s.persona = persona);
    broadcast(&app, &settings);
}

#[tauri::command]
pub fn set_dock_side(app: AppHandle, side: DockSide) -> Result<(), String> {
    let settings = app.state::<AppState>().update(|s| s.dock_side = side);
    broadcast(&app, &settings);
    display::apply(&app, settings.display_mode).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_names(app: AppHandle, user_name: String, assistant_name: String) {
    let settings = app.state::<AppState>().update(|s| {
        s.user_name = user_name.trim().to_owned();
        s.assistant_name = assistant_name.trim().to_owned();
    });
    broadcast(&app, &settings);
}

#[tauri::command]
pub fn open_settings(app: AppHandle) -> Result<(), String> {
    open_settings_window(&app).map_err(|e| e.to_string())
}
