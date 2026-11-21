//! "Pegar uma cor": the eyedropper over the frozen screen (capture overlay in Color
//! mode), the loupe's pixels, the pick itself and the last picks in `colors.json`.

use std::sync::{Mutex, MutexGuard};

use ekko_core::DisplayMode;
use ekko_core::colors::{self, ColorHistory, PickedColor};
use ekko_core::store::JsonFile;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::display::windows::NOTCH;
use crate::services::capture;
use crate::services::shortcuts::TOAST_EVENT;
use crate::services::timers::now_ms;
use crate::state::AppState;

/// A color was picked; payload: `Picked`.
pub const COLOR_PICKED: &str = "ekko://color/picked";
/// The history changed (pick, remove, clear); payload: `ColorHistory`.
pub const COLORS_CHANGED: &str = "ekko://colors/changed";

/// Loupe radius in pixels: an 11×11 grid around the cursor.
pub const LOUPE_RADIUS: u32 = 5;

pub struct ColorService {
    data: Mutex<ColorHistory>,
    file: JsonFile,
}

#[derive(Debug, Clone, Serialize)]
pub struct Picked {
    pub color: PickedColor,
}

pub fn init(app: &AppHandle) {
    let dir = app.path().app_data_dir().unwrap_or_default();
    let file = JsonFile::new(&dir, "colors.json");
    let data: ColorHistory = file.load().unwrap_or_default();
    app.manage(ColorService {
        data: Mutex::new(data),
        file,
    });
}

fn data(app: &AppHandle) -> MutexGuard<'_, ColorHistory> {
    app.state::<ColorService>()
        .inner()
        .data
        .lock()
        .expect("colors lock")
}

pub fn history(app: &AppHandle) -> ColorHistory {
    data(app).clone()
}

/// Changes the history, saves it and tells every window.
pub fn mutate(app: &AppHandle, change: impl FnOnce(&mut ColorHistory)) -> ColorHistory {
    let snapshot = {
        let mut h = data(app);
        change(&mut h);
        if let Err(err) = app.state::<ColorService>().file.save(&*h) {
            eprintln!("[ekko] falha ao salvar as cores: {err}");
        }
        h.clone()
    };
    let _ = app.emit(COLORS_CHANGED, &snapshot);
    snapshot
}

/// The pixels around (x, y) of the frozen screen, for the loupe.
pub fn loupe(app: &AppHandle, x: u32, y: u32) -> Vec<Option<String>> {
    capture::with_frame(app, |f| colors::around(f, x, y, LOUPE_RADIUS)).unwrap_or_default()
}

/// Takes the color at (x, y), closes the eyedropper and keeps it in the history.
pub fn pick(app: &AppHandle, x: u32, y: u32) -> Result<PickedColor, String> {
    let rgb = capture::with_frame(app, |f| colors::pixel(f, x, y))
        .flatten()
        .ok_or("nenhuma cor sob o cursor")?;
    capture::cancel(app);
    let color = PickedColor::new(rgb, now_ms());
    mutate(app, |h| h.add(color.clone()));
    if notch_up(app) {
        // The notch grows into a card with the codes and copy buttons.
        let _ = app.emit(
            COLOR_PICKED,
            &Picked {
                color: color.clone(),
            },
        );
    } else {
        // No notch to show it: copy the HEX right away and say so.
        let hex = color.hex.to_uppercase();
        let message = match copy(&hex) {
            Ok(()) => format!("Cor {hex} copiada"),
            Err(_) => format!("Cor {hex} guardada em Cores"),
        };
        let _ = app.emit(TOAST_EVENT, message);
    }
    Ok(color)
}

/// Notch mode with the notch on screen (not hidden by a fullscreen app).
fn notch_up(app: &AppHandle) -> bool {
    app.state::<AppState>().settings().display_mode == DisplayMode::Notch
        && app
            .get_webview_window(NOTCH)
            .is_some_and(|w| w.is_visible().unwrap_or(false))
}

/// Puts a color code ("#3fe0c5", "rgb(…)") on the clipboard as text.
pub fn copy(text: &str) -> Result<(), String> {
    ekko_os::clipboard::write_text(text)
        .map_err(|_| "a área de transferência está ocupada, tente de novo".into())
}
