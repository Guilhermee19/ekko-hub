//! Home Assistant REST API with a long-lived access token (no OAuth).
//! The token lives in the Credential Manager under [`TOKEN_KEY`]; the base URL in settings.

use std::sync::Arc;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use url::Url;

use crate::http::{Method, Request, Response, Transport};
use crate::{Error, Result};

/// Keyring user for the long-lived access token.
pub const TOKEN_KEY: &str = "home-assistant-token";
/// Domains the settings card can toggle.
pub const TOGGLE_DOMAINS: &[&str] = &["light", "switch", "fan"];

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HaInfo {
    pub version: Option<String>,
    pub location_name: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HaEntity {
    pub entity_id: String,
    pub name: String,
    pub state: String,
    pub domain: String,
}

/// Accepts `homeassistant.local:8123`, `http://192.168.0.10:8123/`, `https://x.ui.nabu.casa/api`
/// and returns `scheme://host[:port][/path]` without a trailing slash or `/api`.
pub fn normalize_url(raw: &str) -> Result<String> {
    let raw = raw.trim();
    if raw.is_empty() {
        return Err(Error::Invalid(
            "informe o endereço do Home Assistant".into(),
        ));
    }
    let with_scheme = if raw.contains("://") {
        raw.to_owned()
    } else {
        format!("http://{raw}")
    };
    let invalid = || Error::Invalid(format!("endereço inválido: {raw}"));
    let url = Url::parse(&with_scheme).map_err(|_| invalid())?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(invalid());
    }
    let mut base = format!("{}://{}", url.scheme(), url.host_str().unwrap_or_default());
    if let Some(port) = url.port() {
        base.push_str(&format!(":{port}"));
    }
    let path = url.path().trim_end_matches('/');
    let path = path.strip_suffix("/api").unwrap_or(path);
    base.push_str(path);
    Ok(base)
}

pub struct HomeAssistant {
    base: String,
    token: String,
    http: Arc<dyn Transport>,
}

impl HomeAssistant {
    pub fn new(base_url: &str, token: &str, http: Arc<dyn Transport>) -> Result<Self> {
        let token = token.trim();
        if token.is_empty() {
            return Err(Error::Invalid(
                "cole o token de acesso do Home Assistant".into(),
            ));
        }
        Ok(Self {
            base: normalize_url(base_url)?,
            token: token.to_owned(),
            http,
        })
    }

    /// Checks the API answers with this token, then reads version + location (best effort).
    pub fn ping(&self) -> Result<HaInfo> {
        self.call(Method::Get, "/api/", None)?;
        let config = self
            .call(Method::Get, "/api/config", None)
            .ok()
            .and_then(|res| serde_json::from_str::<Value>(&res.body).ok())
            .unwrap_or_default();
        let text = |key: &str| config[key].as_str().map(str::to_owned);
        Ok(HaInfo {
            version: text("version"),
            location_name: text("location_name"),
        })
    }

    /// Every entity (or one domain), sorted by name.
    pub fn entities(&self, domain: Option<&str>) -> Result<Vec<HaEntity>> {
        let res = self.call(Method::Get, "/api/states", None)?;
        let states: Vec<Value> =
            serde_json::from_str(&res.body).map_err(|e| Error::Parse(e.to_string()))?;
        let mut list: Vec<HaEntity> = states
            .iter()
            .filter_map(parse_entity)
            .filter(|e| domain.is_none_or(|d| e.domain == d))
            .collect();
        list.sort_by_key(|e| e.name.to_lowercase());
        Ok(list)
    }

    /// Calls `<domain>.toggle`; returns the states HA reports as changed (may be empty).
    pub fn toggle(&self, entity_id: &str) -> Result<Vec<HaEntity>> {
        let domain = entity_domain(entity_id)
            .ok_or_else(|| Error::Invalid(format!("entidade inválida: {entity_id}")))?;
        let res = self.call(
            Method::Post,
            &format!("/api/services/{domain}/toggle"),
            Some(json!({ "entity_id": entity_id })),
        )?;
        let changed: Vec<Value> = serde_json::from_str(&res.body).unwrap_or_default();
        Ok(changed.iter().filter_map(parse_entity).collect())
    }

    fn call(&self, method: Method, path: &str, json: Option<Value>) -> Result<Response> {
        let mut req = Request::new(method, format!("{}{path}", self.base));
        req.bearer = Some(self.token.clone());
        req.json = json;
        let res = self.http.send(&req)?;
        match res.status {
            200..=299 => Ok(res),
            401 | 403 => Err(Error::Api {
                status: res.status,
                message: "token recusado pelo Home Assistant".into(),
            }),
            _ => Err(res.error()),
        }
    }
}

// Manual Debug so the token never ends up in logs.
impl std::fmt::Debug for HomeAssistant {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("HomeAssistant")
            .field("base", &self.base)
            .finish_non_exhaustive()
    }
}

/// `light.sala` → `light`. Rejects ids that could escape the service path.
fn entity_domain(entity_id: &str) -> Option<&str> {
    let (domain, object) = entity_id.split_once('.')?;
    let ok = |s: &str| {
        !s.is_empty()
            && s.chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    };
    (ok(domain) && ok(object)).then_some(domain)
}

fn parse_entity(v: &Value) -> Option<HaEntity> {
    let entity_id = v["entity_id"].as_str()?.to_owned();
    let domain = entity_domain(&entity_id)?.to_owned();
    let name = v["attributes"]["friendly_name"]
        .as_str()
        .unwrap_or(&entity_id)
        .to_owned();
    Some(HaEntity {
        name,
        state: v["state"].as_str().unwrap_or("unknown").to_owned(),
        domain,
        entity_id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::FakeTransport;

    fn client(replies: &[(u16, &str)]) -> (HomeAssistant, Arc<FakeTransport>) {
        let http = Arc::new(FakeTransport::with(replies));
        let ha = HomeAssistant::new("http://192.168.0.10:8123/", "TOKEN", http.clone()).unwrap();
        (ha, http)
    }

    #[test]
    fn normalizes_urls() {
        let cases = [
            (
                "homeassistant.local:8123",
                "http://homeassistant.local:8123",
            ),
            ("http://192.168.0.10:8123/", "http://192.168.0.10:8123"),
            (
                "  https://casa.ui.nabu.casa/api/ ",
                "https://casa.ui.nabu.casa",
            ),
            ("http://10.0.0.5:8123/ha//", "http://10.0.0.5:8123/ha"),
        ];
        for (raw, want) in cases {
            assert_eq!(normalize_url(raw).unwrap(), want, "{raw}");
        }
        assert!(matches!(normalize_url(""), Err(Error::Invalid(_))));
        assert!(matches!(normalize_url("ftp://x"), Err(Error::Invalid(_))));
        assert!(matches!(normalize_url("http://"), Err(Error::Invalid(_))));
    }

    #[test]
    fn ping_reads_version_and_location() {
        let (ha, http) = client(&[
            (200, r#"{"message":"API running."}"#),
            (200, r#"{"version":"2026.11.1","location_name":"Casa"}"#),
        ]);
        let info = ha.ping().unwrap();
        assert_eq!(info.version.as_deref(), Some("2026.11.1"));
        assert_eq!(info.location_name.as_deref(), Some("Casa"));
        let sent = http.requests();
        assert_eq!(sent[0].url, "http://192.168.0.10:8123/api/");
        assert_eq!(sent[0].bearer.as_deref(), Some("TOKEN"));
    }

    #[test]
    fn rejected_token_is_explained() {
        let (ha, _) = client(&[(401, "401: Unauthorized")]);
        let err = ha.ping().unwrap_err().to_string();
        assert!(err.contains("token recusado"), "{err}");
        assert!(!err.contains("TOKEN"));
    }

    #[test]
    fn entities_map_and_filter_by_domain() {
        let states = r#"[
            {"entity_id":"switch.cafeteira","state":"off","attributes":{"friendly_name":"Cafeteira"}},
            {"entity_id":"light.sala","state":"on","attributes":{"friendly_name":"Luz da sala"}},
            {"entity_id":"sensor.temp","state":"22","attributes":{}}]"#;
        let (ha, _) = client(&[(200, states), (200, states)]);
        let all = ha.entities(None).unwrap();
        assert_eq!(all.len(), 3);
        assert_eq!(all[0].name, "Cafeteira");
        assert_eq!(all[2].name, "sensor.temp", "falls back to the id");
        let lights = ha.entities(Some("light")).unwrap();
        assert_eq!(
            lights,
            [HaEntity {
                entity_id: "light.sala".into(),
                name: "Luz da sala".into(),
                state: "on".into(),
                domain: "light".into(),
            }]
        );
    }

    #[test]
    fn toggle_posts_to_the_domain_service() {
        let changed = r#"[{"entity_id":"fan.quarto","state":"on","attributes":{}}]"#;
        let (ha, http) = client(&[(200, changed)]);
        let updated = ha.toggle("fan.quarto").unwrap();
        assert_eq!(updated[0].state, "on");
        let req = &http.requests()[0];
        assert_eq!(req.method, Method::Post);
        assert_eq!(req.url, "http://192.168.0.10:8123/api/services/fan/toggle");
        assert_eq!(req.json, Some(json!({ "entity_id": "fan.quarto" })));
        assert!(ha.toggle("../config").is_err());
        assert!(ha.toggle("light.Sala/x").is_err());
    }

    #[test]
    fn debug_hides_the_token() {
        let (ha, _) = client(&[]);
        assert!(!format!("{ha:?}").contains("TOKEN"));
    }
}
