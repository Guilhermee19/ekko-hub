//! Calendar nudges: confirming an event ("visto") so the notch lets it go.

use ekko_integrations::reminders::Ack;
use tauri::{AppHandle, State};

use crate::services::calendar::{self, Calendar};

#[tauri::command]
pub fn calendar_ack(app: AppHandle, id: String, start_ms: i64) {
    calendar::ack(&app, id, start_ms);
}

/// Confirmed events, for windows that open after the confirmation.
#[tauri::command]
pub fn calendar_acked(state: State<'_, Calendar>) -> Vec<Ack> {
    state.acked()
}
