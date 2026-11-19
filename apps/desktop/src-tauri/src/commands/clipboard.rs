//! Copiados IPC. Mutations return the new snapshot (also broadcast).

use ekko_core::clipboard::{Clipboard, SnippetInput};
use tauri::{AppHandle, Manager};

use crate::services::clipboard::{ClipboardService, mutate};

#[tauri::command]
pub fn clipboard_list(app: AppHandle) -> Clipboard {
    app.state::<ClipboardService>().data().clone()
}

/// Puts text on the clipboard; the watcher then moves it to the top of the history.
#[tauri::command]
pub fn clipboard_copy(text: String) -> Result<(), String> {
    ekko_os::clipboard::write_text(&text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clipboard_pin(app: AppHandle, id: String) -> Clipboard {
    mutate(&app, |c, _| c.toggle_pin(&id))
}

#[tauri::command]
pub fn clipboard_remove(app: AppHandle, id: String) -> Clipboard {
    mutate(&app, |c, _| c.remove(&id))
}

#[tauri::command]
pub fn clipboard_clear(app: AppHandle) -> Clipboard {
    mutate(&app, |c, _| c.clear_unpinned())
}

#[tauri::command]
pub fn clipboard_pause(app: AppHandle, paused: bool) -> Clipboard {
    mutate(&app, |c, _| c.set_paused(paused))
}

#[tauri::command]
pub fn snippet_save(app: AppHandle, snippet: SnippetInput) -> Clipboard {
    mutate(&app, |c, now| c.save_snippet(snippet, now))
}

#[tauri::command]
pub fn snippet_remove(app: AppHandle, id: String) -> Clipboard {
    mutate(&app, |c, _| c.remove_snippet(&id))
}
