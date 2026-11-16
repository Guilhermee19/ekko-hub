//! Now playing + transport controls (Windows media overlay). The work happens on the
//! media thread; these commands only read its latest value or queue a command.

use ekko_os::media::NowPlaying;
use tauri::State;

use crate::services::media::{MediaCommand, MediaService};

#[tauri::command]
pub fn media_now(media: State<'_, MediaService>) -> Option<NowPlaying> {
    media.latest()
}

#[tauri::command]
pub fn media_play_pause(media: State<'_, MediaService>) {
    media.send(MediaCommand::PlayPause);
}

#[tauri::command]
pub fn media_next(media: State<'_, MediaService>) {
    media.send(MediaCommand::Next);
}

#[tauri::command]
pub fn media_previous(media: State<'_, MediaService>) {
    media.send(MediaCommand::Previous);
}

#[tauri::command]
pub fn media_seek(media: State<'_, MediaService>, position_ms: u64) {
    media.send(MediaCommand::Seek(position_ms));
}
