use ekko_core::{DisplayMode, NotchSettings};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::settings::broadcast;
use crate::display::{self, windows};
use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    index: usize,
    name: String,
    width: u32,
    height: u32,
    primary: bool,
}

/// Re-places the notch window if it is the active surface (size/offset/monitor changed).
fn reposition(app: &AppHandle) -> tauri::Result<()> {
    let settings = app.state::<AppState>().settings();
    if settings.display_mode == DisplayMode::Notch
        && let Some(window) = app.get_webview_window(windows::NOTCH)
    {
        display::position(app, &window, windows::NOTCH)?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_notch(app: AppHandle, notch: NotchSettings) -> Result<(), String> {
    let settings = app
        .state::<AppState>()
        .update(|s| s.notch = notch.sanitized());
    broadcast(&app, &settings);
    reposition(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let primary = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .map(|m| *m.position());
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    Ok(monitors
        .iter()
        .enumerate()
        .map(|(index, m)| MonitorInfo {
            index,
            name: m
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Monitor {}", index + 1)),
            width: m.size().width,
            height: m.size().height,
            primary: Some(*m.position()) == primary,
        })
        .collect())
}

#[tauri::command]
pub async fn set_monitor(app: AppHandle, index: usize) -> Result<(), String> {
    let settings = app.state::<AppState>().update(|s| s.monitor = index);
    broadcast(&app, &settings);
    display::apply(&app, settings.display_mode).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notch_drag_start(app: AppHandle) -> Result<(), String> {
    display::notch::drag_start(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notch_drag_move(app: AppHandle) -> Result<(), String> {
    display::notch::drag_move(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn notch_drag_end(app: AppHandle) -> Result<(), String> {
    if display::notch::drag_end(&app) {
        broadcast(&app, &app.state::<AppState>().settings());
    }
    Ok(())
}

/// Initial pill position for a freshly loaded notch window (later ones come by event).
#[tauri::command]
pub fn get_notch_anchor(app: AppHandle) -> Option<f64> {
    let anchor = app.state::<AppState>().notch_anchor();
    (anchor > 0.0).then_some(anchor)
}
