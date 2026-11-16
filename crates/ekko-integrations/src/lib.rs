//! Third-party integrations (Spotify, Google Calendar) over OAuth 2 + PKCE.
//!
//! Everything here is blocking (`reqwest::blocking`): callers on an async runtime must
//! wrap calls in `spawn_blocking`. Users bring their own developer app IDs; tokens and
//! client secrets go to the Windows Credential Manager via [`tokens`].

pub mod google_calendar;
pub mod http;
pub mod loopback;
pub mod oauth;
pub mod pkce;
pub mod reminders;
pub mod session;
pub mod spotify;
pub mod tokens;

use serde::{Deserialize, Serialize};

pub use google_calendar::CalendarEvent;
pub use session::Session;
pub use tokens::{KeyringStore, MemoryStore, SecretStore, Tokens};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provider {
    Spotify,
    Google,
}

impl Provider {
    /// Keyring user name for this provider's tokens.
    pub fn id(self) -> &'static str {
        match self {
            Provider::Spotify => "spotify",
            Provider::Google => "google",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Provider::Spotify => "Spotify",
            Provider::Google => "Google",
        }
    }
}

/// Messages are pt-BR because they reach the UI as-is. Never include tokens here.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("configure o Client ID do {0} antes de conectar")]
    NotConfigured(&'static str),
    #[error("{0} não está conectado")]
    NotConnected(&'static str),
    #[error("falha de rede: {0}")]
    Network(String),
    #[error("o serviço respondeu {status}: {message}")]
    Api { status: u16, message: String },
    #[error("autorização falhou: {0}")]
    OAuth(String),
    #[error("tempo esgotado esperando a autorização no navegador")]
    Timeout,
    #[error("Gerenciador de Credenciais: {0}")]
    Secrets(String),
    #[error("resposta inesperada: {0}")]
    Parse(String),
    #[error("E/S: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, Error>;

/// Unix time in milliseconds.
pub fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
