use ekko_core::DisplayMode;
use tauri::{AppHandle, Manager, State};

use super::settings::broadcast;
use crate::display;
use crate::state::{AppState, HitRect};

/// Shared by the IPC command and the tray menu.
pub fn change_mode(app: &AppHandle, mode: DisplayMode) -> tauri::Result<()> {
    let settings = app.state::<AppState>().update(|s| s.display_mode = mode);
    display::apply(app, mode)?;
    crate::tray::refresh(app)?;
    broadcast(app, &settings);
    Ok(())
}

#[tauri::command]
pub fn set_display_mode(app: AppHandle, mode: DisplayMode) -> Result<(), String> {
    change_mode(&app, mode).map_err(|e| e.to_string())
}

/// The calling overlay window reports which part of it is visible/clickable.
#[tauri::command]
pub fn set_hit_rect(window: tauri::WebviewWindow, state: State<'_, AppState>, rect: HitRect) {
    state.set_hit_rect(window.label(), rect);
}

#[tauri::command]
pub fn summon(app: AppHandle) -> Result<(), String> {
    display::summon::summon(&app, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn show_panel_beside_orb(app: AppHandle) -> Result<(), String> {
    display::show_panel_beside_orb(&app).map_err(|e| e.to_string())
}
