//! Click-through for overlay canvases (notch, dock).
//!
//! WebView2 swallows clicks even on transparent pixels, so these windows ignore the mouse
//! by default and a poller turns input back on only while the cursor is over the visible
//! part (rect reported by the frontend). It also emits hover changes, because the DOM
//! never sees `mouseleave` once the window ignores the cursor.

use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use super::geometry::Rect;
use super::windows::{DOCK, NOTCH};
use crate::state::AppState;

pub const HOVER_EVENT: &str = "ekko://surface/hover";
const TICK: Duration = Duration::from_millis(40);
const TRACKED: [&str; 2] = [NOTCH, DOCK];

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut inside = [false; TRACKED.len()];
        loop {
            thread::sleep(TICK);
            for (i, label) in TRACKED.iter().enumerate() {
                let now = cursor_inside(&app, label).unwrap_or(false);
                if now == inside[i] {
                    continue;
                }
                inside[i] = now;
                if let Some(w) = app.get_webview_window(label) {
                    let _ = w.set_ignore_cursor_events(!now);
                    let _ = w.emit_to(*label, HOVER_EVENT, now);
                }
            }
        }
    });
}

fn cursor_inside(app: &AppHandle, label: &str) -> Option<bool> {
    let window = app.get_webview_window(label)?;
    if !window.is_visible().ok()? {
        return Some(false);
    }
    let state = app.state::<AppState>();
    // Mid-drag the cursor can outrun the window; keep input on until it is released.
    if label == NOTCH && state.drag().is_some() {
        return Some(true);
    }
    let hit = state.hit_rect(label)?;
    let cursor = app.cursor_position().ok()?;
    let origin = window.outer_position().ok()?;
    let scale = window.scale_factor().ok()?;
    let rect = Rect::new(
        origin.x + (hit.x * scale) as i32,
        origin.y + (hit.y * scale) as i32,
        (hit.w * scale) as i32,
        (hit.h * scale) as i32,
    );
    Some(rect.contains(cursor.x as i32, cursor.y as i32))
}
