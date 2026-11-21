//! Global hotkeys from `Settings.shortcuts`. Re-registered as a whole on every change;
//! another app may own a combo, so each action reports ok / taken / invalid and a
//! missing hotkey never stops Ekko (the tray menu still works).

use crate::services::capture::CaptureMode;
use std::sync::Mutex;

use ekko_core::{ShortcutAction, ShortcutSettings};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::display;
use crate::state::AppState;

/// Short toast text for every surface (`stores/assistant.ts` shows it).
pub const TOAST_EVENT: &str = "ekko://toast";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShortcutStatus {
    Ok,
    /// Another app (or another Ekko action) already owns every candidate combo.
    Taken,
    Invalid,
    /// Saved but not registered: its feature isn't built yet, and grabbing the combo
    /// globally would only steal it from other apps (e.g. Ctrl+Shift+E in VS Code).
    Pending,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutReport {
    pub action: ShortcutAction,
    pub status: ShortcutStatus,
    /// Combo actually registered (differs from the setting when a fallback won).
    pub active: Option<String>,
}

#[derive(Default)]
pub struct ShortcutRegistry(Mutex<Vec<ShortcutReport>>);

impl ShortcutRegistry {
    pub fn reports(&self) -> Vec<ShortcutReport> {
        self.0.lock().expect("shortcuts lock").clone()
    }
}

pub fn init(app: &AppHandle) {
    app.manage(ShortcutRegistry::default());
    let shortcuts = app.state::<AppState>().settings().shortcuts;
    apply(app, &shortcuts);
}

/// Unregisters everything and registers the new set. Blocks on the main thread
/// (plugin), so call it from setup or an `async` command, never a sync one.
pub fn apply(app: &AppHandle, shortcuts: &ShortcutSettings) -> Vec<ShortcutReport> {
    if let Err(err) = app.global_shortcut().unregister_all() {
        eprintln!("[ekko] falha ao liberar atalhos: {err}");
    }
    let reports: Vec<ShortcutReport> = ShortcutAction::ALL
        .into_iter()
        .map(|action| register(app, shortcuts, action))
        .collect();
    *app.state::<ShortcutRegistry>()
        .0
        .lock()
        .expect("shortcuts lock") = reports.clone();
    reports
}

fn register(
    app: &AppHandle,
    shortcuts: &ShortcutSettings,
    action: ShortcutAction,
) -> ShortcutReport {
    let report = |status, active| ShortcutReport {
        action,
        status,
        active,
    };
    let Ok(candidates) = shortcuts.candidates(action) else {
        return report(ShortcutStatus::Invalid, None);
    };
    if action.arrives_in().is_some() {
        return report(ShortcutStatus::Pending, None);
    }
    let mut status = ShortcutStatus::Invalid;
    for accel in candidates {
        let Ok(shortcut) = accel.parse::<Shortcut>() else {
            continue;
        };
        let result = app
            .global_shortcut()
            .on_shortcut(shortcut, move |app, _, event| {
                if event.state == ShortcutState::Pressed {
                    run(app, action);
                }
            });
        match result {
            Ok(()) => return report(ShortcutStatus::Ok, Some(accel)),
            Err(err) => {
                eprintln!(
                    "[ekko] atalho de {} ocupado ({accel}): {err}",
                    action.label()
                );
                status = ShortcutStatus::Taken;
            }
        }
    }
    report(status, None)
}

fn run(app: &AppHandle, action: ShortcutAction) {
    match action {
        ShortcutAction::Summon => {
            let _ = display::summon::summon(app, None);
        }
        ShortcutAction::Palette => {
            let _ = display::flows::toggle_palette(app);
        }
        ShortcutAction::Capture => {
            if let Err(err) = crate::services::capture::start(app, CaptureMode::Print) {
                let _ = app.emit(TOAST_EVENT, format!("Não deu para tirar o print: {err}"));
            }
        }
        ShortcutAction::Color => {
            if let Err(err) = crate::services::capture::start(app, CaptureMode::Color) {
                let _ = app.emit(TOAST_EVENT, format!("Não deu para pegar a cor: {err}"));
            }
        }
        // Not registered while pending (see `register`); kept for when they are.
        other => {
            let phase = other.arrives_in().unwrap_or("uma próxima versão");
            let _ = app.emit(TOAST_EVENT, format!("{} chega na {phase}", other.label()));
        }
    }
}
