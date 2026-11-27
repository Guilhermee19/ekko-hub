//! Shared plumbing for Spotify / Google / Gmail / Outlook: keyring store, HTTP client and sessions.
//! All `ekko-integrations` calls block, so commands run them on `spawn_blocking`.

use std::sync::{Arc, OnceLock};

use ekko_core::IntegrationsSettings;
use ekko_integrations::http::{ReqwestTransport, Transport};
use ekko_integrations::mail::{gmail, outlook};
use ekko_integrations::oauth::OAuthClient;
use ekko_integrations::tokens::{GOOGLE_CLIENT_SECRET, KeyringStore, SecretStore};
use ekko_integrations::{Error, Provider, Result, Session, google_calendar, spotify};
use tauri::{AppHandle, Manager};

use crate::state::AppState;

pub struct Integrations {
    store: Arc<dyn SecretStore>,
    http: OnceLock<Arc<ReqwestTransport>>,
}

/// Registers the shared state and starts the calendar, e-mail and weather pollers.
pub fn init(app: &AppHandle) {
    app.manage(Integrations {
        store: Arc::new(KeyringStore),
        http: OnceLock::new(),
    });
    super::calendar::spawn(app);
    super::mail::spawn(app);
    super::weather::spawn(app);
}

impl Integrations {
    pub fn store(&self) -> &dyn SecretStore {
        self.store.as_ref()
    }

    /// Built lazily on a blocking thread (reqwest::blocking must not start on tokio).
    pub fn http(&self) -> Result<Arc<dyn Transport>> {
        if let Some(http) = self.http.get() {
            return Ok(http.clone());
        }
        let http = Arc::new(ReqwestTransport::new()?);
        Ok(self.http.get_or_init(|| http).clone())
    }

    pub fn session(&self, provider: Provider, ids: &IntegrationsSettings) -> Result<Session> {
        let oauth = match provider {
            Provider::Spotify => spotify::oauth(client_id(&ids.spotify_client_id, provider)?),
            // Gmail rides on the Agenda's Google client, with its own consent.
            Provider::Google => self.google(ids, provider, google_calendar::oauth)?,
            Provider::Gmail => self.google(ids, provider, gmail::oauth)?,
            Provider::Outlook => match (
                client_id(&ids.outlook_client_id, provider),
                outlook::builtin_client(),
            ) {
                (Ok(id), _) | (Err(_), Some(id)) => outlook::oauth(id),
                (Err(err), None) => return Err(err),
            },
        };
        Ok(Session::new(
            provider,
            oauth,
            self.store.clone(),
            self.http()?,
        ))
    }
}

impl Integrations {
    /// The user's own Google client wins; otherwise the one this build ships with.
    fn google(
        &self,
        ids: &IntegrationsSettings,
        provider: Provider,
        oauth: fn(&str, Option<String>) -> OAuthClient,
    ) -> Result<OAuthClient> {
        match (
            client_id(&ids.google_client_id, provider),
            google_calendar::builtin_client(),
        ) {
            (Ok(id), _) => Ok(oauth(id, self.store.get(GOOGLE_CLIENT_SECRET)?)),
            (Err(_), Some((id, secret))) => Ok(oauth(id, Some(secret.into()))),
            (Err(err), None) => Err(err),
        }
    }
}

fn client_id(id: &Option<String>, provider: Provider) -> Result<&str> {
    id.as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .ok_or(Error::NotConfigured(provider.label()))
}

/// Session for `provider` using the client IDs saved in settings.
pub fn session(app: &AppHandle, provider: Provider) -> Result<Session> {
    let ids = app.state::<AppState>().settings().integrations;
    app.state::<Integrations>().session(provider, &ids)
}

/// Opens an http(s) URL in the default browser. On Windows `rundll32` hands the URL
/// straight to the shell, so `&` in query strings is never parsed by cmd.exe.
pub fn open_browser(url: &str) -> Result<()> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err(Error::OAuth("só abro links http(s)".into()));
    }
    let mut cmd = if cfg!(windows) {
        let mut c = std::process::Command::new("rundll32");
        c.arg("url.dll,FileProtocolHandler");
        c
    } else {
        std::process::Command::new("open")
    };
    cmd.arg(url).spawn().map(|_| ()).map_err(Error::Io)
}
