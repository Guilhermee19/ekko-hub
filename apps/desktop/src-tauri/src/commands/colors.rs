//! Color picker IPC: start the eyedropper, read the loupe, pick, copy and the history.

use ekko_core::colors::{ColorHistory, PickedColor, Rgb};
use tauri::AppHandle;

use crate::services::capture::{self, CaptureMode};
use crate::services::colors;
use crate::services::timers::now_ms;

/// `async`: it may build the capture window (see guard.rs).
#[tauri::command]
pub async fn color_start(app: AppHandle) -> Result<(), String> {
    capture::start(&app, CaptureMode::Color)
}

#[tauri::command]
pub fn color_loupe(app: AppHandle, x: u32, y: u32) -> Vec<Option<String>> {
    colors::loupe(&app, x, y)
}

#[tauri::command]
pub fn color_pick(app: AppHandle, x: u32, y: u32) -> Result<PickedColor, String> {
    colors::pick(&app, x, y)
}

#[tauri::command]
pub fn color_copy(text: String) -> Result<(), String> {
    colors::copy(&text)
}

#[tauri::command]
pub fn color_history(app: AppHandle) -> ColorHistory {
    colors::history(&app)
}

/// Keeps a color chosen on the Cores page (grid, spectrum, sliders) in the history.
#[tauri::command]
pub fn color_save(app: AppHandle, hex: String) -> Result<ColorHistory, String> {
    let rgb = Rgb::from_hex(&hex).ok_or("cor inválida, use #rrggbb")?;
    let color = PickedColor::new(rgb, now_ms());
    Ok(colors::mutate(&app, |h| h.add(color)))
}

#[tauri::command]
pub fn color_remove(app: AppHandle, hex: String) -> ColorHistory {
    colors::mutate(&app, |h| h.remove(&hex))
}

#[tauri::command]
pub fn color_clear(app: AppHandle) -> ColorHistory {
    colors::mutate(&app, |h| h.colors.clear())
}
