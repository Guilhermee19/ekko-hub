//! "Call Ekko": the same action for tray click and the global hotkey,
//! resolved differently per display mode.

use ekko_core::DisplayMode;
use tauri::{AppHandle, Emitter, Manager};

use super::windows::{DOCK, HUB, NOTCH, VOICE};
use crate::state::AppState;

/// Surfaces that expand themselves listen to this.
pub const SUMMON_EVENT: &str = "ekko://surface/summon";

pub fn summon(app: &AppHandle, cursor: Option<(i32, i32)>) -> tauri::Result<()> {
    let mode = app.state::<AppState>().settings().display_mode;
    match mode {
        DisplayMode::Tray => {
            let at =
                cursor.or_else(|| app.cursor_position().ok().map(|p| (p.x as i32, p.y as i32)));
            super::toggle_panel_from_tray(app, at.unwrap_or((0, i32::MAX)))
        }
        DisplayMode::Orb => super::show_panel_beside_orb(app),
        DisplayMode::Notch => app.emit_to(NOTCH, SUMMON_EVENT, ()),
        DisplayMode::Dock => app.emit_to(DOCK, SUMMON_EVENT, ()),
        DisplayMode::Hub => match app.get_webview_window(HUB) {
            Some(w) => {
                w.show()?;
                w.unminimize()?;
                w.set_focus()
            }
            None => super::apply(app, mode),
        },
        DisplayMode::VoiceOnly => {
            super::show_voice_overlay(app)?;
            app.emit_to(VOICE, SUMMON_EVENT, ())
        }
    }
}
