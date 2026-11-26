//! Taskbar mode: the widget sits over the Windows taskbar, which is itself always on
//! top and jumps above it whenever it is clicked. The 1 s fullscreen watcher is too
//! slow for that (the widget would blink away), so this one re-raises it every 250 ms,
//! and the panel above it, while the mode is on.

use std::thread;
use std::time::Duration;

use ekko_core::DisplayMode;
use ekko_os::fullscreen;
use tauri::{AppHandle, Manager};

use crate::display::windows::{self, PANEL, TASKBAR};
use crate::services::fullscreen::hidden;
use crate::state::AppState;

const POLL: Duration = Duration::from_millis(250);

pub fn spawn(app: &AppHandle) {
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-taskbar".into())
        .spawn(move || {
            loop {
                thread::sleep(POLL);
                tick(&app);
            }
        });
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o widget da barra de tarefas: {err}");
    }
}

fn tick(app: &AppHandle) {
    if hidden() || app.state::<AppState>().settings().display_mode != DisplayMode::Taskbar {
        return;
    }
    let hwnds: Vec<isize> = [TASKBAR, PANEL]
        .iter()
        .filter_map(|label| app.get_webview_window(label))
        .filter(|w| w.is_visible().unwrap_or(false))
        .filter_map(|w| windows::native_handle(&w).ok())
        .collect();
    fullscreen::raise_topmost(&hwnds);
}
