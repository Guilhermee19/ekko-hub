//! Display modes: decides which surface windows exist, where they sit and what shows.

pub mod flows;
pub mod geometry;
pub mod hit;
pub mod notch;
pub mod summon;
pub mod windows;

use ekko_core::{DisplayMode, DockSide};
use tauri::{AppHandle, Manager, WebviewWindow};

use crate::state::AppState;
use geometry::Rect;
use windows::{DOCK, HUB, NOTCH, ORB, PANEL, TASKBAR, VOICE};

const MARGIN: i32 = 12;

/// Hides every other surface and shows/positions the one for `mode`.
pub fn apply(app: &AppHandle, mode: DisplayMode) -> tauri::Result<()> {
    let primary = primary_surface(mode);
    for label in windows::MODE_SURFACES {
        if Some(label) != primary
            && let Some(w) = app.get_webview_window(label)
        {
            w.hide()?;
        }
    }
    let Some(label) = primary else {
        return Ok(()); // tray mode: nothing pinned until the icon is clicked
    };
    let window = windows::ensure(app, label)?;
    position(app, &window, label)?;
    if label == NOTCH || label == DOCK {
        // Click-through until the hit poller sees the cursor over the visible part.
        window.set_ignore_cursor_events(true)?;
    }
    window.show()?;
    if mode == DisplayMode::Hub {
        window.set_focus()?;
    }
    Ok(())
}

/// The always-visible surface of each mode. Tray and voice-only have none.
pub fn primary_surface(mode: DisplayMode) -> Option<&'static str> {
    match mode {
        DisplayMode::Notch => Some(NOTCH),
        DisplayMode::Orb => Some(ORB),
        DisplayMode::Dock => Some(DOCK),
        DisplayMode::Hub => Some(HUB),
        DisplayMode::Taskbar => Some(TASKBAR),
        DisplayMode::Tray | DisplayMode::VoiceOnly => None,
    }
}

pub fn position(app: &AppHandle, window: &WebviewWindow, label: &str) -> tauri::Result<()> {
    let settings = app.state::<AppState>().settings();
    let Some(m) = windows::monitor(app, settings.monitor) else {
        return Ok(());
    };
    let (w, h) = windows::physical_size(app, label, &m);
    let work = windows::work_rect(&m);
    let rect = match label {
        NOTCH => return notch::place(app, window, &m, settings.notch.offset),
        ORB => geometry::orb(work, w, settings.orb_position, MARGIN * 2),
        DOCK => geometry::dock(work, settings.dock_side == DockSide::Right, w),
        VOICE => {
            let bottom = work.bottom() - h - MARGIN * 4;
            Rect::new(work.x + (work.w - w) / 2, bottom, w, h)
        }
        HUB => geometry::centered(work, w, h),
        TASKBAR => {
            let monitor = windows::monitor_rect(&m);
            geometry::taskbar_widget(monitor, work, w, h, MARGIN / 2)
        }
        _ => return Ok(()),
    };
    windows::place(window, rect)
}

/// Shows the shared popover panel at a precomputed rect (tray click, orb click).
pub fn show_panel_at(
    app: &AppHandle,
    rect_for: impl Fn(Rect, i32, i32) -> Rect,
) -> tauri::Result<()> {
    let panel = windows::ensure(app, PANEL)?;
    let settings = app.state::<AppState>().settings();
    if let Some(m) = windows::monitor(app, settings.monitor) {
        let (w, h) = windows::physical_size(app, PANEL, &m);
        windows::place(&panel, rect_for(windows::work_rect(&m), w, h))?;
    }
    panel.show()?;
    panel.set_focus()
}

pub fn toggle_panel_from_tray(app: &AppHandle, cursor: (i32, i32)) -> tauri::Result<()> {
    if let Some(panel) = app.get_webview_window(PANEL)
        && panel.is_visible()?
    {
        return panel.hide();
    }
    show_panel_at(app, |work, w, h| {
        geometry::tray_flyout(work, cursor, w, h, MARGIN)
    })
}

pub fn show_panel_beside_orb(app: &AppHandle) -> tauri::Result<()> {
    let Some(orb) = app.get_webview_window(ORB) else {
        return Ok(());
    };
    let pos = orb.outer_position()?;
    let size = orb.outer_size()?;
    let anchor = Rect::new(pos.x, pos.y, size.width as i32, size.height as i32);
    show_panel_at(app, |work, w, h| {
        geometry::beside(work, anchor, w, h, MARGIN)
    })
}

/// Taskbar mode: the panel opens above the widget; a second click closes it.
pub fn toggle_panel_above_taskbar(app: &AppHandle) -> tauri::Result<()> {
    if let Some(panel) = app.get_webview_window(PANEL)
        && panel.is_visible()?
    {
        return panel.hide();
    }
    let Some(widget) = app.get_webview_window(TASKBAR) else {
        return Ok(());
    };
    let pos = widget.outer_position()?;
    let size = widget.outer_size()?;
    let anchor = Rect::new(pos.x, pos.y, size.width as i32, size.height as i32);
    show_panel_at(app, |work, w, h| {
        geometry::above_widget(work, anchor, w, h, MARGIN)
    })
}

/// Voice-only mode: the transient overlay.
pub fn show_voice_overlay(app: &AppHandle) -> tauri::Result<()> {
    let window = windows::ensure(app, VOICE)?;
    position(app, &window, VOICE)?;
    window.show()
}
