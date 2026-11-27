//! E-mail IPC (read-only). Opening a message uses `open_external` with its link.

use ekko_integrations::MailMessage;
use tauri::{AppHandle, State};

use crate::services::mail::{self, Mail};

/// The last list the poller saw (windows that open late ask for it).
#[tauri::command]
pub fn mail_messages(state: State<'_, Mail>) -> Vec<MailMessage> {
    state.messages()
}

/// Looks for new messages now instead of waiting for the next minute.
#[tauri::command]
pub fn mail_refresh(app: AppHandle) {
    mail::request_refresh(&app);
}
