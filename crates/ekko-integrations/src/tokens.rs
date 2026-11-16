//! Token + secret storage. Real store = Windows Credential Manager (service "ekko-hub").

use std::collections::HashMap;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::{Error, Provider, Result};

pub const SERVICE: &str = "ekko-hub";
/// Keyring user for the Google "Desktop app" client secret.
pub const GOOGLE_CLIENT_SECRET: &str = "google-client-secret";
/// Refresh this long before the real expiry so a request never races it.
const EXPIRY_SKEW_MS: i64 = 60_000;

#[derive(Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Tokens {
    pub access: String,
    pub refresh: Option<String>,
    /// Unix ms when `access` stops working.
    pub expires_at: i64,
    /// Display name / e-mail of the linked account (not a secret; saves an API call).
    #[serde(default)]
    pub account: Option<String>,
}

impl Tokens {
    pub fn is_expired(&self, now_ms: i64) -> bool {
        now_ms + EXPIRY_SKEW_MS >= self.expires_at
    }
}

// Manual Debug so tokens never end up in logs.
impl std::fmt::Debug for Tokens {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Tokens")
            .field("expires_at", &self.expires_at)
            .field("account", &self.account)
            .finish_non_exhaustive()
    }
}

pub trait SecretStore: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<String>>;
    fn set(&self, key: &str, value: &str) -> Result<()>;
    fn delete(&self, key: &str) -> Result<()>;
}

pub struct KeyringStore;

impl KeyringStore {
    fn entry(key: &str) -> Result<keyring::Entry> {
        keyring::Entry::new(SERVICE, key).map_err(|e| Error::Secrets(e.to_string()))
    }
}

impl SecretStore for KeyringStore {
    fn get(&self, key: &str) -> Result<Option<String>> {
        match Self::entry(key)?.get_password() {
            Ok(value) => Ok(Some(value)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(Error::Secrets(e.to_string())),
        }
    }

    fn set(&self, key: &str, value: &str) -> Result<()> {
        Self::entry(key)?
            .set_password(value)
            .map_err(|e| Error::Secrets(e.to_string()))
    }

    fn delete(&self, key: &str) -> Result<()> {
        match Self::entry(key)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(Error::Secrets(e.to_string())),
        }
    }
}

/// In-memory store for tests.
#[derive(Default)]
pub struct MemoryStore(Mutex<HashMap<String, String>>);

impl SecretStore for MemoryStore {
    fn get(&self, key: &str) -> Result<Option<String>> {
        Ok(self.0.lock().expect("store lock").get(key).cloned())
    }

    fn set(&self, key: &str, value: &str) -> Result<()> {
        self.0
            .lock()
            .expect("store lock")
            .insert(key.to_owned(), value.to_owned());
        Ok(())
    }

    fn delete(&self, key: &str) -> Result<()> {
        self.0.lock().expect("store lock").remove(key);
        Ok(())
    }
}

pub fn load(store: &dyn SecretStore, provider: Provider) -> Result<Option<Tokens>> {
    let Some(raw) = store.get(provider.id())? else {
        return Ok(None);
    };
    // A corrupt entry means "not connected", not a hard failure.
    Ok(serde_json::from_str(&raw).ok())
}

pub fn save(store: &dyn SecretStore, provider: Provider, tokens: &Tokens) -> Result<()> {
    let raw = serde_json::to_string(tokens).map_err(|e| Error::Parse(e.to_string()))?;
    store.set(provider.id(), &raw)
}

pub fn clear(store: &dyn SecretStore, provider: Provider) -> Result<()> {
    store.delete(provider.id())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Tokens {
        Tokens {
            access: "a".into(),
            refresh: Some("r".into()),
            expires_at: 100_000,
            account: None,
        }
    }

    #[test]
    fn expiry_has_a_safety_margin() {
        let t = sample();
        assert!(!t.is_expired(0));
        assert!(t.is_expired(100_000 - EXPIRY_SKEW_MS));
        assert!(t.is_expired(200_000));
    }

    #[test]
    fn round_trips_through_a_store() {
        let store = MemoryStore::default();
        assert!(load(&store, Provider::Spotify).unwrap().is_none());
        save(&store, Provider::Spotify, &sample()).unwrap();
        assert_eq!(load(&store, Provider::Spotify).unwrap(), Some(sample()));
        assert!(load(&store, Provider::Google).unwrap().is_none());
        clear(&store, Provider::Spotify).unwrap();
        assert!(load(&store, Provider::Spotify).unwrap().is_none());
    }

    #[test]
    fn debug_never_prints_tokens() {
        let text = format!(
            "{:?}",
            Tokens {
                access: "SECRET".into(),
                ..sample()
            }
        );
        assert!(!text.contains("SECRET"));
    }
}
