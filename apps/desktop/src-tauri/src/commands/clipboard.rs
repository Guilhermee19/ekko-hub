//! Copiados IPC. Mutations return the new snapshot (also broadcast).

use ekko_core::clipboard::{Clipboard, SnippetInput};
use tauri::{AppHandle, Manager};

use crate::services::clipboard::{ClipboardService, copy_back, mutate};

#[tauri::command]
pub fn clipboard_list(app: AppHandle) -> Clipboard {
    app.state::<ClipboardService>().data().clone()
}

/// Puts text on the clipboard; the watcher then moves it to the top of the history.
#[tauri::command]
pub fn clipboard_copy(text: String) -> Result<(), String> {
    ekko_os::clipboard::write_text(&text).map_err(|e| e.to_string())
}

/// Puts a history item back on the clipboard (text, image or files) and moves it up.
/// `async` so reading a big image from disk never blocks the UI thread.
#[tauri::command]
pub async fn clipboard_copy_item(app: AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || copy_back(&app, &id))
        .await
        .map_err(|e| e.to_string())?
}

/// How many unpinned items to keep (20, 50, 100 or 200); trims right away.
#[tauri::command]
pub fn clipboard_set_limit(app: AppHandle, limit: usize) -> Clipboard {
    mutate(&app, |c, _| c.set_limit(limit))
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
