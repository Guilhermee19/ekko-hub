//! "Geral" and "Atalhos" settings: autostart, fullscreen, quiet hours, sounds, hotkeys.

use ekko_core::{GeneralSettings, ShortcutSettings};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt;

use super::settings::broadcast;
use crate::services::shortcuts::{self, ShortcutRegistry, ShortcutReport};
use crate::state::AppState;

/// The OS is the source of truth for autostart (the user may remove it in Task Manager).
pub fn sync_autostart(app: &AppHandle) {
    let Ok(real) = app.autolaunch().is_enabled() else {
        return;
    };
    let state = app.state::<AppState>();
    if state.settings().general.autostart != real {
        state.update(|s| s.general.autostart = real);
    }
}

/// Turns "Iniciar com o Windows" on/off and returns the real OS state afterwards.
#[tauri::command]
pub fn set_autostart(app: AppHandle, on: bool) -> Result<bool, String> {
    let launcher = app.autolaunch();
    let result = if on {
        launcher.enable()
    } else {
        launcher.disable()
    };
    let real = launcher.is_enabled().unwrap_or(false);
    let settings = app
        .state::<AppState>()
        .update(|s| s.general.autostart = real);
    broadcast(&app, &settings);
    result.map(|()| real).map_err(|e| e.to_string())
}

/// Everything in "Geral" except autostart (that one goes through `set_autostart`).
#[tauri::command]
pub fn set_general(app: AppHandle, general: GeneralSettings) {
    let settings = app.state::<AppState>().update(|s| {
        let autostart = s.general.autostart;
        s.general = GeneralSettings {
            autostart,
            ..general.sanitized()
        };
    });
    broadcast(&app, &settings);
}

/// Saves the combos and re-registers them. `async`: the plugin blocks on the main thread.
#[tauri::command]
pub async fn set_shortcuts(
    app: AppHandle,
    shortcuts: ShortcutSettings,
) -> Result<Vec<ShortcutReport>, String> {
    let settings = app
        .state::<AppState>()
        .update(|s| s.shortcuts = shortcuts.clone());
    broadcast(&app, &settings);
    Ok(shortcuts::apply(&app, &shortcuts))
}

#[tauri::command]
pub fn shortcut_status(registry: State<'_, ShortcutRegistry>) -> Vec<ShortcutReport> {
    registry.reports()
}
