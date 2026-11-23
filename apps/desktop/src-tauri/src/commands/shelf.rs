//! Prateleira IPC. Mutations return the new snapshot (also broadcast).

use std::process::Command;

use ekko_core::shelf::{DropMode, Shelf};
use tauri::{AppHandle, Manager, WebviewWindow};

use crate::services::shelf::{self, ShelfService, entry, exists, mutate};

/// Also forgets files that were moved or deleted since the last look.
#[tauri::command]
pub fn shelf_list(app: AppHandle) -> Shelf {
    mutate(&app, |s, _| s.retain_existing(exists))
}

/// Paths dropped on the notch. Ignored while our own drag is passing over it.
#[tauri::command]
pub fn shelf_add(app: AppHandle, paths: Vec<String>) -> Shelf {
    if app.state::<ShelfService>().dragging() {
        return app.state::<ShelfService>().data().clone();
    }
    let entries = paths.iter().filter_map(|p| entry(p)).collect();
    mutate(&app, |s, now| s.add(entries, now) > 0)
}

#[tauri::command]
pub fn shelf_remove(app: AppHandle, ids: Vec<String>) -> Shelf {
    mutate(&app, |s, _| s.remove(&ids))
}

#[tauri::command]
pub fn shelf_clear(app: AppHandle) -> Shelf {
    mutate(&app, |s, _| s.clear())
}

#[tauri::command]
pub fn shelf_set_mode(app: AppHandle, mode: DropMode) -> Shelf {
    mutate(&app, |s, _| s.set_mode(mode))
}

/// Drags the given items (all when `ids` is null) out of the calling window.
#[tauri::command]
pub fn shelf_drag_out(
    app: AppHandle,
    window: WebviewWindow,
    ids: Option<Vec<String>>,
) -> Result<(), String> {
    let paths = app.state::<ShelfService>().data().paths(ids.as_deref());
    shelf::drag_out(&app, &window, paths)
}

/// Opens the file with its default app (folders open in Explorer / Finder).
#[tauri::command]
pub fn shelf_open(app: AppHandle, id: String) -> Result<(), String> {
    let path = path_of(&app, &id)?;
    let opener = if cfg!(windows) { "explorer" } else { "open" };
    spawn(Command::new(opener).arg(path))
}

/// Shows the file selected in its Explorer / Finder folder.
#[tauri::command]
pub fn shelf_reveal(app: AppHandle, id: String) -> Result<(), String> {
    let path = path_of(&app, &id)?;
    spawn(&mut reveal(&path))
}

#[cfg(windows)]
fn reveal(path: &str) -> Command {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("explorer");
    // Windows paths never contain quotes, so wrapping is safe.
    cmd.raw_arg(format!("/select,\"{path}\""));
    cmd
}

#[cfg(not(windows))]
fn reveal(path: &str) -> Command {
    let mut cmd = Command::new("open");
    cmd.args(["-R", path]);
    cmd
}

fn spawn(cmd: &mut Command) -> Result<(), String> {
    cmd.spawn().map(drop).map_err(|e| e.to_string())
}

fn path_of(app: &AppHandle, id: &str) -> Result<String, String> {
    let service = app.state::<ShelfService>();
    let path = service.data().find(id).map(|i| i.path.clone());
    path.ok_or_else(|| "esse arquivo não está mais na prateleira".into())
}
