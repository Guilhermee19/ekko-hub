//! Battery levels for the pill chip (changes arrive as `POWER_CHANGED`).

use ekko_core::hud::PowerSnapshot;
use tauri::State;

use crate::services::system_hud::PowerState;

#[tauri::command]
pub fn power_snapshot(state: State<'_, PowerState>) -> PowerSnapshot {
    state.get()
}
