//! Home Assistant + Claude Code IPC. Network, keyring and process calls block, so every
//! command is `async` and hops to `spawn_blocking`. The HA token never leaves Rust.

use ekko_integrations::Error;
use ekko_integrations::claude_code::{self, ClaudeCodeStatus};
use ekko_integrations::home_assistant::{HaEntity, HomeAssistant, TOKEN_KEY, normalize_url};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::integrations::blocking;
use super::settings::broadcast;
use crate::services::integrations::Integrations;
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HaStatus {
    url: Option<String>,
    has_token: bool,
    connected: bool,
    version: Option<String>,
    location_name: Option<String>,
    /// Why the last check failed (pt-BR), when URL + token are set but HA did not answer.
    error: Option<String>,
}

fn client(app: &AppHandle) -> Result<HomeAssistant, Error> {
    let url = app
        .state::<AppState>()
        .settings()
        .integrations
        .home_assistant_url
        .ok_or(Error::NotConnected("Home Assistant"))?;
    let integrations = app.state::<Integrations>();
    let token = integrations
        .store()
        .get(TOKEN_KEY)?
        .ok_or(Error::NotConnected("Home Assistant"))?;
    HomeAssistant::new(&url, &token, integrations.http()?)
}

fn status(app: &AppHandle) -> Result<HaStatus, Error> {
    let url = app
        .state::<AppState>()
        .settings()
        .integrations
        .home_assistant_url;
    let has_token = app
        .state::<Integrations>()
        .store()
        .get(TOKEN_KEY)?
        .is_some();
    let mut out = HaStatus {
        url,
        has_token,
        connected: false,
        version: None,
        location_name: None,
        error: None,
    };
    if out.url.is_none() || !has_token {
        return Ok(out);
    }
    match client(app).and_then(|ha| ha.ping()) {
        Ok(info) => {
            out.connected = true;
            out.version = info.version;
            out.location_name = info.location_name;
        }
        Err(e) => out.error = Some(e.to_string()),
    }
    Ok(out)
}

#[tauri::command]
pub async fn ha_status(app: AppHandle) -> Result<HaStatus, String> {
    blocking(&app, status).await
}

/// Saves the URL (settings) and, when given, the token (keyring), then tests the link.
/// An empty token keeps the saved one, so the URL can be fixed without pasting it again.
#[tauri::command]
pub async fn ha_set(app: AppHandle, url: String, token: String) -> Result<HaStatus, String> {
    let url = normalize_url(&url).map_err(|e| e.to_string())?;
    let settings = app
        .state::<AppState>()
        .update(|s| s.integrations.home_assistant_url = Some(url));
    broadcast(&app, &settings);
    blocking(&app, move |app| {
        let token = token.trim();
        if !token.is_empty() {
            app.state::<Integrations>().store().set(TOKEN_KEY, token)?;
        }
        status(app)
    })
    .await
}

/// Forgets the token and the URL.
#[tauri::command]
pub async fn ha_disconnect(app: AppHandle) -> Result<HaStatus, String> {
    let settings = app
        .state::<AppState>()
        .update(|s| s.integrations.home_assistant_url = None);
    broadcast(&app, &settings);
    blocking(&app, |app| {
        app.state::<Integrations>().store().delete(TOKEN_KEY)?;
        status(app)
    })
    .await
}

#[tauri::command]
pub async fn ha_entities(app: AppHandle, domain: Option<String>) -> Result<Vec<HaEntity>, String> {
    blocking(&app, move |app| client(app)?.entities(domain.as_deref())).await
}

/// Returns the entities HA reports as changed by the toggle.
#[tauri::command]
pub async fn ha_toggle(app: AppHandle, entity_id: String) -> Result<Vec<HaEntity>, String> {
    blocking(&app, move |app| client(app)?.toggle(&entity_id)).await
}

#[tauri::command]
pub async fn claude_code_status() -> Result<ClaudeCodeStatus, String> {
    tauri::async_runtime::spawn_blocking(claude_code::detect)
        .await
        .map_err(|e| e.to_string())
}
