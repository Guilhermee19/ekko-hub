//! Spotify + Google Calendar IPC. Every call blocks on the network or the keyring,
//! so commands are `async` and hop to `spawn_blocking`. Tokens never leave Rust.

use std::time::Duration;

use ekko_integrations::spotify::{
    self, Control, Repeat, SpotifyDevice, SpotifyPlayback, SpotifyQueue,
};
use ekko_integrations::tokens::{self, GOOGLE_CLIENT_SECRET};
use ekko_integrations::{CalendarEvent, Error, Provider, google_calendar};
use serde::Serialize;
use tauri::{AppHandle, Manager};

use super::settings::broadcast;
use crate::services::calendar;
use crate::services::integrations::{Integrations, open_browser, session};
use crate::state::AppState;

/// How long we wait for the user to finish the login in the browser.
const LOGIN_TIMEOUT: Duration = Duration::from_secs(180);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    connected: bool,
    account: Option<String>,
    client_id: Option<String>,
    /// Google only: a client secret is saved in the Credential Manager.
    has_secret: bool,
    /// This build ships its own client: connecting is one click, no setup.
    built_in: bool,
}

#[derive(Serialize)]
pub struct IntegrationStatus {
    spotify: ProviderStatus,
    google: ProviderStatus,
}

/// Runs blocking integration work off the async runtime; errors become UI strings.
pub(super) async fn blocking<T: Send + 'static>(
    app: &AppHandle,
    job: impl FnOnce(&AppHandle) -> Result<T, Error> + Send + 'static,
) -> Result<T, String> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || job(&app))
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

fn status_of(app: &AppHandle, provider: Provider) -> Result<ProviderStatus, Error> {
    let store = app.state::<Integrations>();
    let saved = tokens::load(store.store(), provider)?;
    let ids = app.state::<AppState>().settings().integrations;
    let (client_id, has_secret) = match provider {
        Provider::Spotify => (ids.spotify_client_id, false),
        Provider::Google => (
            ids.google_client_id,
            store.store().get(GOOGLE_CLIENT_SECRET)?.is_some(),
        ),
    };
    Ok(ProviderStatus {
        connected: saved.is_some(),
        account: saved.and_then(|t| t.account),
        client_id,
        has_secret,
        built_in: provider == Provider::Google && google_calendar::builtin_client().is_some(),
    })
}

fn full_status(app: &AppHandle) -> Result<IntegrationStatus, Error> {
    Ok(IntegrationStatus {
        spotify: status_of(app, Provider::Spotify)?,
        google: status_of(app, Provider::Google)?,
    })
}

#[tauri::command]
pub async fn integration_status(app: AppHandle) -> Result<IntegrationStatus, String> {
    blocking(&app, full_status).await
}

/// Saves the user's developer app ID (settings) and, for Google, its secret (keyring).
#[tauri::command]
pub async fn set_integration_client(
    app: AppHandle,
    provider: Provider,
    client_id: String,
    client_secret: Option<String>,
) -> Result<IntegrationStatus, String> {
    let id = Some(client_id.trim().to_owned()).filter(|id| !id.is_empty());
    let settings = app.state::<AppState>().update(|s| match provider {
        Provider::Spotify => s.integrations.spotify_client_id = id,
        Provider::Google => s.integrations.google_client_id = id,
    });
    broadcast(&app, &settings);
    blocking(&app, move |app| {
        let secret = client_secret
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty());
        if let (Provider::Google, Some(secret)) = (provider, secret) {
            app.state::<Integrations>()
                .store()
                .set(GOOGLE_CLIENT_SECRET, &secret)?;
        }
        full_status(app)
    })
    .await
}

fn login(app: &AppHandle, provider: Provider) -> Result<IntegrationStatus, Error> {
    let s = session(app, provider)?;
    let port = match provider {
        Provider::Spotify => spotify::REDIRECT_PORT,
        Provider::Google => 0,
    };
    let mut tokens = s.authorize(port, LOGIN_TIMEOUT, &open_browser)?;
    tokens.account = match provider {
        Provider::Spotify => spotify::account(&s)?,
        Provider::Google => google_calendar::account(&s)?,
    };
    s.save(&tokens)?;
    if provider == Provider::Google {
        calendar::request_refresh(app);
    }
    full_status(app)
}

#[tauri::command]
pub async fn connect_spotify(app: AppHandle) -> Result<IntegrationStatus, String> {
    blocking(&app, |app| login(app, Provider::Spotify)).await
}

#[tauri::command]
pub async fn connect_google(app: AppHandle) -> Result<IntegrationStatus, String> {
    blocking(&app, |app| login(app, Provider::Google)).await
}

/// Forgets the tokens (the Google client secret stays, so reconnecting is one click).
#[tauri::command]
pub async fn disconnect_integration(
    app: AppHandle,
    provider: Provider,
) -> Result<IntegrationStatus, String> {
    blocking(&app, move |app| {
        tokens::clear(app.state::<Integrations>().store(), provider)?;
        if provider == Provider::Google {
            calendar::publish(app, Vec::new());
        }
        full_status(app)
    })
    .await
}

#[tauri::command]
pub async fn calendar_upcoming(app: AppHandle) -> Result<Vec<CalendarEvent>, String> {
    blocking(&app, calendar::refresh).await
}

#[tauri::command]
pub async fn spotify_state(app: AppHandle) -> Result<Option<SpotifyPlayback>, String> {
    blocking(&app, |app| {
        spotify::playback(&session(app, Provider::Spotify)?)
    })
    .await
}

#[tauri::command]
pub async fn spotify_devices(app: AppHandle) -> Result<Vec<SpotifyDevice>, String> {
    blocking(&app, |app| {
        spotify::devices(&session(app, Provider::Spotify)?)
    })
    .await
}

#[tauri::command]
pub async fn spotify_queue(app: AppHandle) -> Result<SpotifyQueue, String> {
    blocking(&app, |app| {
        spotify::queue(&session(app, Provider::Spotify)?)
    })
    .await
}

#[tauri::command]
pub async fn spotify_transfer(app: AppHandle, device_id: String) -> Result<(), String> {
    blocking(&app, move |app| {
        spotify::transfer(&session(app, Provider::Spotify)?, &device_id, true)
    })
    .await
}

/// `action`: "play" | "pause" | "next" | "previous".
#[tauri::command]
pub async fn spotify_control(app: AppHandle, action: String) -> Result<(), String> {
    let action = match action.as_str() {
        "play" => Control::Play,
        "pause" => Control::Pause,
        "next" => Control::Next,
        "previous" => Control::Previous,
        other => return Err(format!("ação desconhecida: {other}")),
    };
    blocking(&app, move |app| {
        spotify::control(&session(app, Provider::Spotify)?, action)
    })
    .await
}

#[tauri::command]
pub async fn spotify_shuffle(app: AppHandle, on: bool) -> Result<(), String> {
    blocking(&app, move |app| {
        spotify::set_shuffle(&session(app, Provider::Spotify)?, on)
    })
    .await
}

/// `mode`: "off" | "track" | "context".
#[tauri::command]
pub async fn spotify_repeat(app: AppHandle, mode: Repeat) -> Result<(), String> {
    blocking(&app, move |app| {
        spotify::set_repeat(&session(app, Provider::Spotify)?, mode)
    })
    .await
}

#[tauri::command]
pub async fn spotify_seek(app: AppHandle, position_ms: u64) -> Result<(), String> {
    blocking(&app, move |app| {
        spotify::seek(&session(app, Provider::Spotify)?, position_ms)
    })
    .await
}

/// `percent`: 0..100 on the active Spotify device.
#[tauri::command]
pub async fn spotify_volume(app: AppHandle, percent: u8) -> Result<(), String> {
    blocking(&app, move |app| {
        spotify::set_volume(&session(app, Provider::Spotify)?, percent)
    })
    .await
}

/// Opens an http(s) link in the default browser (meeting links, developer dashboards).
#[tauri::command]
pub async fn open_external(url: String) -> Result<(), String> {
    open_browser(&url).map_err(|e| e.to_string())
}
