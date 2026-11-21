//! Transient windows that are not display modes: command palette, welcome flow, alarm.

use std::sync::atomic::{AtomicBool, Ordering};

use ekko_core::DisplayMode;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use super::geometry::Rect;
use super::windows::{self, ALARM, NOTCH, ONBOARDING, PALETTE};
use crate::state::AppState;

/// Palette re-opened: the UI clears the query and focuses the input.
pub const PALETTE_OPEN_EVENT: &str = "ekko://palette/open";
/// A new alarm for the alarm window (payload: the alarm object from the frontend).
pub const ALARM_EVENT: &str = "ekko://alarm/show";
/// In notch mode the notch itself grows into the alarm card instead of a window.
pub const ALARM_NOTCH_EVENT: &str = "ekko://alarm/notch";

/// Windows sends a spurious blur while a popup is being shown; the palette only
/// closes on blur after it really had focus.
static PALETTE_FOCUSED: AtomicBool = AtomicBool::new(false);

/// Called from the window event handler; returns true when the palette should hide.
pub fn palette_focus_changed(focused: bool) -> bool {
    if focused {
        PALETTE_FOCUSED.store(true, Ordering::Relaxed);
        false
    } else {
        PALETTE_FOCUSED.swap(false, Ordering::Relaxed)
    }
}

/// Monitor under the cursor, so the palette opens where the user is looking.
fn active_monitor(app: &AppHandle) -> Option<tauri::Monitor> {
    let cursor = app.cursor_position().ok()?;
    windows::monitor_at(app, cursor.x as i32, cursor.y as i32)
        .map(|(_, m)| m)
        .or_else(|| windows::monitor(app, app.state::<AppState>().settings().monitor))
}

pub fn toggle_palette(app: &AppHandle) -> tauri::Result<()> {
    let window = windows::ensure(app, PALETTE)?;
    if window.is_visible()? {
        return window.hide();
    }
    if let Some(m) = active_monitor(app) {
        let (w, h) = windows::physical_size(app, PALETTE, &m);
        let work = windows::work_rect(&m);
        // Upper third, like Spotlight/Raycast.
        let rect = Rect::new(work.x + (work.w - w) / 2, work.y + work.h / 5, w, h);
        windows::place(&window, rect)?;
    }
    PALETTE_FOCUSED.store(false, Ordering::Relaxed);
    window.show()?;
    window.set_focus()?;
    window.emit_to(PALETTE, PALETTE_OPEN_EVENT, ())
}

pub fn show_onboarding(app: &AppHandle) -> tauri::Result<()> {
    let window = windows::ensure(app, ONBOARDING)?;
    window.center()?;
    window.show()?;
    window.set_focus()
}

/// Shows the alarm: in notch mode the notch expands into a card (with snooze); in the
/// other modes, the alarm window near the top of the active monitor.
pub fn show_alarm(app: &AppHandle, alarm: Value) -> tauri::Result<()> {
    // Hidden notch (fullscreen game or video): the window still shows, as before.
    let notch_up = app
        .get_webview_window(NOTCH)
        .is_some_and(|w| w.is_visible().unwrap_or(false));
    if notch_up && app.state::<AppState>().settings().display_mode == DisplayMode::Notch {
        return app.emit(ALARM_NOTCH_EVENT, alarm);
    }
    app.state::<AppState>()
        .set_pending_alarm(Some(alarm.clone()));
    let window = windows::ensure(app, ALARM)?;
    if let Some(m) = active_monitor(app) {
        let (w, h) = windows::physical_size(app, ALARM, &m);
        let work = windows::work_rect(&m);
        let rect = Rect::new(work.x + (work.w - w) / 2, work.y + work.h / 6, w, h);
        windows::place(&window, rect)?;
    }
    window.show()?;
    window.set_focus()?;
    // A freshly built window may not be listening yet; it also calls `take_alarm`.
    window.emit_to(ALARM, ALARM_EVENT, alarm)
}
