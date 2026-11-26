//! Window catalog: one Tauri window per surface, created lazily.
//! The frontend picks what to render from the window label.

use ekko_core::NotchSize;
use tauri::{AppHandle, Manager, Monitor, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use super::geometry::Rect;
use crate::state::AppState;

pub const NOTCH: &str = "notch";
pub const PANEL: &str = "panel";
pub const ORB: &str = "orb";
pub const DOCK: &str = "dock";
pub const HUB: &str = "hub";
pub const VOICE: &str = "voice";
pub const SETTINGS: &str = "settings";
pub const PALETTE: &str = "palette";
pub const ONBOARDING: &str = "onboarding";
pub const ALARM: &str = "alarm";
pub const CAPTURE: &str = "capture";
pub const TASKBAR: &str = "taskbar";

/// Every surface that belongs to a display mode (settings is independent).
pub const MODE_SURFACES: [&str; 7] = [NOTCH, PANEL, ORB, DOCK, HUB, VOICE, TASKBAR];

struct Spec {
    title: &'static str,
    w: f64,
    h: f64,
    overlay: bool,
}

fn spec(label: &str, notch: NotchSize) -> Spec {
    let (title, w, h, overlay) = match label {
        // Canvas big enough for the expanded panel; transparent parts are click-through.
        NOTCH => {
            let (w, h) = notch.canvas();
            ("Ekko", w, h, true)
        }
        PANEL => ("Ekko", 400.0, 580.0, true),
        ORB => ("Ekko", 96.0, 96.0, true),
        DOCK => ("Ekko", 400.0, 800.0, true),
        VOICE => ("Ekko", 560.0, 140.0, true),
        // Height follows the real taskbar; 48 is Windows 11's default.
        TASKBAR => ("Ekko", 280.0, 48.0, true),
        HUB => ("Ekko Hub", 1180.0, 760.0, false),
        PALETTE => ("Ekko · Comandos", 680.0, 540.0, true),
        ALARM => ("Ekko · Alarme", 460.0, 300.0, true),
        // Placed over the whole monitor when a print starts.
        CAPTURE => ("Ekko · Print", 800.0, 600.0, true),
        ONBOARDING => ("Bem-vindo ao Ekko", 760.0, 560.0, false),
        _ => ("Ekko · Configurações", 1000.0, 700.0, false),
    };
    Spec {
        title,
        w,
        h,
        overlay,
    }
}

/// Returns the window, building it hidden on first use.
pub fn ensure(app: &AppHandle, label: &str) -> tauri::Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(label) {
        return Ok(window);
    }
    let s = spec(label, notch_size(app));
    let builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(s.title)
        .inner_size(s.w, s.h)
        .decorations(false)
        .visible(false);
    let builder = if s.overlay {
        builder
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(false)
    } else {
        builder.min_inner_size(720.0, 520.0).center()
    };
    builder.build()
}

/// Monitor chosen in settings, falling back to the primary one.
pub fn monitor(app: &AppHandle, index: usize) -> Option<Monitor> {
    let monitors = app.available_monitors().ok()?;
    monitors
        .get(index)
        .cloned()
        .or_else(|| app.primary_monitor().ok().flatten())
}

pub fn monitor_rect(m: &Monitor) -> Rect {
    Rect::new(
        m.position().x,
        m.position().y,
        m.size().width as i32,
        m.size().height as i32,
    )
}

pub fn work_rect(m: &Monitor) -> Rect {
    let area = m.work_area();
    Rect::new(
        area.position.x,
        area.position.y,
        area.size.width as i32,
        area.size.height as i32,
    )
}

/// Logical spec size → physical pixels for the given monitor.
pub fn physical_size(app: &AppHandle, label: &str, m: &Monitor) -> (i32, i32) {
    let s = spec(label, notch_size(app));
    let scale = m.scale_factor();
    ((s.w * scale).round() as i32, (s.h * scale).round() as i32)
}

pub fn place(window: &WebviewWindow, r: Rect) -> tauri::Result<()> {
    window.set_size(tauri::PhysicalSize::new(r.w as u32, r.h as u32))?;
    window.set_position(tauri::PhysicalPosition::new(r.x, r.y))
}

fn notch_size(app: &AppHandle) -> NotchSize {
    app.state::<AppState>().settings().notch.size
}

/// Monitor under a physical point (used while dragging the notch across screens).
pub fn monitor_at(app: &AppHandle, x: i32, y: i32) -> Option<(usize, Monitor)> {
    let monitors = app.available_monitors().ok()?;
    monitors
        .into_iter()
        .enumerate()
        .find(|(_, m)| monitor_rect(m).contains(x, y))
}

/// Win32 handle of `window` for the `ekko_os` calls that need one. Other systems have
/// no HWND, so those features (drag out, re-raising on top) report unsupported there.
pub fn native_handle(window: &WebviewWindow) -> Result<isize, String> {
    #[cfg(windows)]
    {
        window
            .hwnd()
            .map(|h| h.0 as isize)
            .map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = window;
        Err("recurso disponível só no Windows".into())
    }
}
