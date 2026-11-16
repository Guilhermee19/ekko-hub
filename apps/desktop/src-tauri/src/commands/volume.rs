//! Windows master volume (works without any login). Core Audio blocks briefly, so the
//! commands are `async` and hop to a blocking thread; every change is broadcast.

use ekko_os::volume::{self, VolumeState};
use tauri::AppHandle;

use crate::services::volume::publish;

async fn run(
    app: AppHandle,
    job: impl FnOnce() -> volume::Result<VolumeState> + Send + 'static,
) -> Result<VolumeState, String> {
    let state = tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
    publish(&app, state);
    Ok(state)
}

#[tauri::command]
pub async fn volume_get(app: AppHandle) -> Result<VolumeState, String> {
    run(app, volume::get).await
}

/// `level`: 0..1 (clamped).
#[tauri::command]
pub async fn volume_set(app: AppHandle, level: f32) -> Result<VolumeState, String> {
    run(app, move || volume::set_level(level)).await
}

/// `delta`: e.g. 0.05 / -0.05.
#[tauri::command]
pub async fn volume_step(app: AppHandle, delta: f32) -> Result<VolumeState, String> {
    run(app, move || volume::step(delta)).await
}

#[tauri::command]
pub async fn volume_mute(app: AppHandle, on: bool) -> Result<VolumeState, String> {
    run(app, move || volume::set_muted(on)).await
}
