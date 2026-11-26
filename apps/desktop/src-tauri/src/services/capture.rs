//! Prints ("Alt Gr + Print Screen"): freezes the monitor under the cursor, shows it in
//! the full-screen `capture` window to pick an area, then saves the PNG in
//! Pictures\Ekko and puts it on the shelf, where the notch offers copy and drag.
//! The color picker reuses the same frozen screen in `Color` mode (services/colors.rs).

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use ekko_core::capture::{Frame, Region, file_name};
use ekko_os::screen;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::display::windows::{self, CAPTURE};
use crate::services::productivity::local_offset_ms;
use crate::services::shelf::{entry, mutate};
use crate::services::timers::now_ms;

/// The overlay should load the frozen frame; payload: `Frozen`.
pub const CAPTURE_START: &str = "ekko://capture/start";
/// A print was saved; payload: `Saved`.
pub const CAPTURE_SAVED: &str = "ekko://capture/saved";

#[derive(Default)]
pub struct CaptureService {
    frozen: Mutex<Option<(Frame, PathBuf)>>,
    mode: Mutex<CaptureMode>,
}

/// What the overlay is for: cutting a print or picking a color.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CaptureMode {
    #[default]
    Print,
    Color,
}

/// What the overlay shows: the frozen screen as a file the webview may read.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Frozen {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub mode: CaptureMode,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    /// Shelf item id; None when the shelf is full (the file is still saved).
    pub id: Option<String>,
    pub path: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// Already on the clipboard as an image (false when the clipboard was busy).
    pub copied: bool,
}

pub fn init(app: &AppHandle) {
    app.manage(CaptureService::default());
}

/// Freezes the screen under the cursor and opens the overlay (area or eyedropper).
pub fn start(app: &AppHandle, mode: CaptureMode) -> Result<(), String> {
    let window = windows::ensure(app, CAPTURE).map_err(|e| e.to_string())?;
    if window.is_visible().unwrap_or(false) {
        return Ok(());
    }
    let cursor = app.cursor_position().map_err(|e| e.to_string())?;
    let monitor = windows::monitor_at(app, cursor.x as i32, cursor.y as i32)
        .map(|(_, m)| m)
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or("nenhum monitor encontrado")?;
    let rect = windows::monitor_rect(&monitor);
    let pixels = screen::grab(rect.x, rect.y, rect.w, rect.h).map_err(|e| e.to_string())?;
    let frame = Frame {
        width: pixels.width,
        height: pixels.height,
        bgra: pixels.bgra,
    };
    // A new name each time: the webview would otherwise show the cached last print.
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("capture");
    clear_dir(&dir);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("frozen-{:x}.bmp", now_ms()));
    std::fs::write(&path, frame.bmp()).map_err(|e| e.to_string())?;
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|e| e.to_string())?;
    let info = Frozen {
        path: path.to_string_lossy().into_owned(),
        width: frame.width,
        height: frame.height,
        mode,
    };
    *service(app) = Some((frame, path));
    *app.state::<CaptureService>()
        .mode
        .lock()
        .expect("capture lock") = mode;
    windows::place(&window, rect).map_err(|e| e.to_string())?;
    let _ = window.emit_to(CAPTURE, CAPTURE_START, &info);
    window.show().map_err(|e| e.to_string())?;
    let _ = window.set_focus();
    Ok(())
}

/// The frame the overlay is showing (it asks on mount, in case it missed the event).
pub fn frozen(app: &AppHandle) -> Option<Frozen> {
    let mode = *app
        .state::<CaptureService>()
        .mode
        .lock()
        .expect("capture lock");
    service(app).as_ref().map(|(f, p)| Frozen {
        path: p.to_string_lossy().into_owned(),
        width: f.width,
        height: f.height,
        mode,
    })
}

/// Reads the frozen frame without ending the capture (the eyedropper's loupe).
pub fn with_frame<T>(app: &AppHandle, read: impl FnOnce(&Frame) -> T) -> Option<T> {
    service(app).as_ref().map(|(f, _)| read(f))
}

/// Crops the frozen frame to `region` (frame pixels), saves it and shelves it.
pub fn commit(app: &AppHandle, region: Region) -> Result<Saved, String> {
    let (frame, frozen_path) = service(app).take().ok_or("nenhum print em andamento")?;
    let _ = std::fs::remove_file(&frozen_path);
    let cut = frame.crop(region).map_err(|e| e.to_string())?;
    let png = cut.png().map_err(|e| e.to_string())?;
    let dir = app
        .path()
        .picture_dir()
        .map_err(|e| e.to_string())?
        .join("Ekko");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = free_path(&dir, &file_name(now_ms(), local_offset_ms()));
    std::fs::write(&path, png).map_err(|e| e.to_string())?;
    // Like Win+Shift+S: the print is ready to paste. A busy clipboard doesn't fail the
    // save; the card still offers the copy.
    let copied = ekko_os::clipboard::write_image(&cut.dib()).is_ok();
    let path = path.to_string_lossy().into_owned();
    let added = entry(&path).into_iter().collect();
    let shelf = mutate(app, |s, now| s.add(added, now) > 0);
    let item = shelf.items.iter().find(|i| i.path == path);
    let saved = Saved {
        id: item.map(|i| i.id.clone()),
        name: item.map_or_else(|| path.clone(), |i| i.name.clone()),
        path: path.clone(),
        width: cut.width,
        height: cut.height,
        copied,
    };
    let _ = app.emit(CAPTURE_SAVED, &saved);
    Ok(saved)
}

/// Drops the frozen frame (Esc, or the overlay closed without a pick).
pub fn cancel(app: &AppHandle) {
    if let Some((_, path)) = service(app).take() {
        let _ = std::fs::remove_file(path);
    }
    if let Some(w) = app.get_webview_window(CAPTURE) {
        let _ = w.hide();
    }
}

/// Puts a PNG on the clipboard as an image.
pub fn copy_image(path: &str) -> Result<(), String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let frame = Frame::from_png(&bytes).map_err(|e| e.to_string())?;
    ekko_os::clipboard::write_image(&frame.dib())
        .map_err(|_| "a área de transferência está ocupada, tente de novo".into())
}

fn service(app: &AppHandle) -> std::sync::MutexGuard<'_, Option<(Frame, PathBuf)>> {
    app.state::<CaptureService>()
        .inner()
        .frozen
        .lock()
        .expect("capture lock")
}

/// Leftover frozen frames from a crash or an earlier print.
fn clear_dir(dir: &Path) {
    if let Ok(read) = std::fs::read_dir(dir) {
        for e in read.flatten() {
            let _ = std::fs::remove_file(e.path());
        }
    }
}

/// `name` in `dir`, with " (2)", " (3)"… when two prints land in the same second.
fn free_path(dir: &Path, name: &str) -> PathBuf {
    let first = dir.join(name);
    if !first.exists() {
        return first;
    }
    let stem = name.trim_end_matches(".png");
    (2..)
        .map(|n| dir.join(format!("{stem} ({n}).png")))
        .find(|p| !p.exists())
        .unwrap_or(first)
}
