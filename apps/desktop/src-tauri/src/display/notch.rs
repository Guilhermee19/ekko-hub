//! Placing the notch on the top edge, and dragging it along (and across monitors).
//!
//! The frontend only says "drag started / moved / ended"; the window follows the real
//! cursor here, so it works the same on monitors with different DPI.

use tauri::{AppHandle, Emitter, Manager, Monitor, WebviewWindow};

use super::geometry;
use super::windows::{self, NOTCH};
use crate::state::AppState;

/// Pill center inside the notch window, logical px. The frontend draws the pill there.
pub const ANCHOR_EVENT: &str = "ekko://notch/anchor";

#[derive(Debug, Clone, Copy)]
pub struct Drag {
    /// Cursor x minus pill center x when grabbed, physical px.
    grab: f64,
    /// Last spot (monitor index, offset), saved on release.
    last: Option<(usize, f64)>,
}

/// Puts the notch window on `m` with the pill center at `offset` and tells the UI.
pub fn place(
    app: &AppHandle,
    window: &WebviewWindow,
    m: &Monitor,
    offset: f64,
) -> tauri::Result<()> {
    let (w, h) = windows::physical_size(app, NOTCH, m);
    let p = geometry::notch(windows::monitor_rect(m), w, h, offset);
    windows::place(window, p.window)?;
    let anchor = f64::from(p.anchor) / m.scale_factor();
    app.state::<AppState>().set_notch_anchor(anchor);
    window.emit_to(NOTCH, ANCHOR_EVENT, anchor)
}

pub fn drag_start(app: &AppHandle) -> tauri::Result<()> {
    let Some(window) = app.get_webview_window(NOTCH) else {
        return Ok(());
    };
    let state = app.state::<AppState>();
    let cursor = app.cursor_position()?;
    let pos = window.outer_position()?;
    let pill_center = f64::from(pos.x) + state.notch_anchor() * window.scale_factor()?;
    state.set_drag(Some(Drag {
        grab: cursor.x - pill_center,
        last: None,
    }));
    Ok(())
}

pub fn drag_move(app: &AppHandle) -> tauri::Result<()> {
    let state = app.state::<AppState>();
    let (Some(mut drag), Some(window)) = (state.drag(), app.get_webview_window(NOTCH)) else {
        return Ok(());
    };
    let cursor = app.cursor_position()?;
    let Some((index, m)) = windows::monitor_at(app, cursor.x as i32, cursor.y as i32) else {
        return Ok(()); // cursor in a gap between monitors: keep the last spot
    };
    let center = (cursor.x - drag.grab).round() as i32;
    let offset = geometry::notch_offset(windows::monitor_rect(&m), center);
    drag.last = Some((index, offset));
    state.set_drag(Some(drag));
    place(app, &window, &m, offset)
}

/// Saves the final monitor + offset. Returns whether settings changed.
pub fn drag_end(app: &AppHandle) -> bool {
    let state = app.state::<AppState>();
    let Some(drag) = state.drag() else {
        return false;
    };
    state.set_drag(None);
    let Some((index, offset)) = drag.last else {
        return false;
    };
    state.update(|s| {
        s.monitor = index;
        s.notch.offset = offset;
    });
    true
}
