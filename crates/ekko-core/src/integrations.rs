//! Third-party integrations config. Users bring their own developer app IDs.
//! Client IDs are public identifiers; the Google client secret and every token live in
//! the Windows Credential Manager (see `ekko-integrations::tokens`), never here.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct IntegrationsSettings {
    pub spotify_client_id: Option<String>,
    pub google_client_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_ids_default_to_none() {
        let parsed: IntegrationsSettings = serde_json::from_str("{}").unwrap();
        assert_eq!(parsed, IntegrationsSettings::default());
        let json = serde_json::to_string(&IntegrationsSettings {
            spotify_client_id: Some("abc".into()),
            google_client_id: None,
        })
        .unwrap();
        assert!(json.contains("\"spotifyClientId\":\"abc\""));
    }
}
