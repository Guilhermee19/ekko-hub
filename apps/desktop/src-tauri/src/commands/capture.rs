//! Print IPC: the overlay asks for the frozen frame, commits a region or cancels.

use ekko_core::capture::Region;
use tauri::{AppHandle, Manager};

use crate::services::capture::{self, CaptureMode, Frozen, Saved};
use crate::services::shelf::ShelfService;

#[tauri::command]
pub fn capture_frame(app: AppHandle) -> Option<Frozen> {
    capture::frozen(&app)
}

#[tauri::command]
pub fn capture_commit(app: AppHandle, region: Region) -> Result<Saved, String> {
    capture::commit(&app, region)
}

#[tauri::command]
pub fn capture_cancel(app: AppHandle) {
    capture::cancel(&app);
}

/// `async`: it may build the capture window (see guard.rs).
#[tauri::command]
pub async fn capture_start(app: AppHandle) -> Result<(), String> {
    capture::start(&app, CaptureMode::Print)
}

/// Copies a shelved image (a print) to the clipboard as a picture.
#[tauri::command]
pub fn shelf_copy_image(app: AppHandle, id: String) -> Result<(), String> {
    let path = app
        .state::<ShelfService>()
        .data()
        .find(&id)
        .map(|i| i.path.clone())
        .ok_or("esse arquivo não está mais na prateleira")?;
    capture::copy_image(&path)
}
