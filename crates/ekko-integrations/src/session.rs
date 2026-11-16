//! An authorized connection to one provider: login flow, auto-refresh, API calls.

use std::sync::Arc;
use std::time::Duration;

use serde_json::Value;

use crate::http::{Method, Request, Response, Transport};
use crate::loopback::Loopback;
use crate::oauth::OAuthClient;
use crate::tokens::{self, SecretStore, Tokens};
use crate::{Error, Provider, Result, now_ms, pkce};

pub struct Session {
    pub provider: Provider,
    pub oauth: OAuthClient,
    store: Arc<dyn SecretStore>,
    http: Arc<dyn Transport>,
}

impl Session {
    pub fn new(
        provider: Provider,
        oauth: OAuthClient,
        store: Arc<dyn SecretStore>,
        http: Arc<dyn Transport>,
    ) -> Self {
        Self {
            provider,
            oauth,
            store,
            http,
        }
    }

    pub fn tokens(&self) -> Result<Option<Tokens>> {
        tokens::load(self.store.as_ref(), self.provider)
    }

    pub fn save(&self, tokens: &Tokens) -> Result<()> {
        tokens::save(self.store.as_ref(), self.provider, tokens)
    }

    pub fn disconnect(&self) -> Result<()> {
        tokens::clear(self.store.as_ref(), self.provider)
    }

    /// Full browser login. `open` launches the system browser with the auth URL.
    /// Returns (and stores) fresh tokens; the caller fills `account` afterwards.
    pub fn authorize(
        &self,
        port: u16,
        timeout: Duration,
        open: &dyn Fn(&str) -> Result<()>,
    ) -> Result<Tokens> {
        let loopback = Loopback::bind(port)?;
        let redirect = loopback.redirect_uri();
        let verifier = pkce::verifier()?;
        let state = pkce::random_token(24)?;
        open(
            &self
                .oauth
                .authorize_url(&redirect, &state, &pkce::challenge(&verifier)),
        )?;
        let code = loopback.wait(&state, timeout)?;
        let tokens =
            self.oauth
                .exchange(self.http.as_ref(), &code, &verifier, &redirect, now_ms())?;
        self.save(&tokens)?;
        Ok(tokens)
    }

    /// A valid access token, refreshing (and persisting) it when close to expiry.
    pub fn access_token(&self) -> Result<String> {
        let current = self
            .tokens()?
            .ok_or(Error::NotConnected(self.provider.label()))?;
        if !current.is_expired(now_ms()) {
            return Ok(current.access);
        }
        Ok(self.refresh(&current)?.access)
    }

    fn refresh(&self, current: &Tokens) -> Result<Tokens> {
        let fresh = self.oauth.refresh(self.http.as_ref(), current, now_ms())?;
        self.save(&fresh)?;
        Ok(fresh)
    }

    /// GET JSON. `Ok(None)` for 204 (e.g. Spotify with nothing playing).
    pub fn get(&self, url: &str) -> Result<Option<Value>> {
        let res = self.call(Request::new(Method::Get, url))?;
        if res.status == 204 || res.body.trim().is_empty() {
            return Ok(None);
        }
        serde_json::from_str(&res.body)
            .map(Some)
            .map_err(|e| Error::Parse(e.to_string()))
    }

    /// PUT/POST where only success matters.
    pub fn send(&self, method: Method, url: &str, json: Option<Value>) -> Result<()> {
        let mut req = Request::new(method, url);
        req.json = json;
        self.call(req).map(|_| ())
    }

    /// Authorized call; on 401 refreshes once and retries (token revoked/rotated early).
    fn call(&self, mut req: Request) -> Result<Response> {
        req.bearer = Some(self.access_token()?);
        let res = self.http.send(&req)?;
        let res = if res.status == 401 {
            let current = self
                .tokens()?
                .ok_or(Error::NotConnected(self.provider.label()))?;
            req.bearer = Some(self.refresh(&current)?.access);
            self.http.send(&req)?
        } else {
            res
        };
        if res.ok() { Ok(res) } else { Err(res.error()) }
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::http::FakeTransport;
    use crate::tokens::MemoryStore;

    pub fn session(
        provider: Provider,
        replies: &[(u16, &str)],
        expires_at: i64,
    ) -> (Session, Arc<FakeTransport>) {
        let http = Arc::new(FakeTransport::with(replies));
        let store = Arc::new(MemoryStore::default());
        let oauth = OAuthClient {
            auth_url: "https://auth.example/a",
            token_url: "https://auth.example/token",
            client_id: "cid".into(),
            client_secret: None,
            scopes: &[],
            extra: &[],
        };
        let s = Session::new(provider, oauth, store, http.clone());
        let t = Tokens {
            access: "OLD".into(),
            refresh: Some("R".into()),
            expires_at,
            account: None,
        };
        s.save(&t).unwrap();
        (s, http)
    }

    #[test]
    fn valid_token_is_used_as_is() {
        let (s, http) = session(Provider::Spotify, &[(200, "{\"ok\":true}")], i64::MAX);
        assert_eq!(s.get("https://api/x").unwrap().unwrap()["ok"], true);
        assert_eq!(http.requests()[0].bearer.as_deref(), Some("OLD"));
    }

    #[test]
    fn expired_token_is_refreshed_and_saved() {
        let (s, http) = session(
            Provider::Spotify,
            &[
                (200, r#"{"access_token":"NEW","expires_in":3600}"#),
                (204, ""),
            ],
            0,
        );
        assert!(s.get("https://api/x").unwrap().is_none());
        assert_eq!(http.requests()[1].bearer.as_deref(), Some("NEW"));
        assert_eq!(s.tokens().unwrap().unwrap().access, "NEW");
    }

    #[test]
    fn unauthorized_retries_once_after_refresh() {
        let (s, http) = session(
            Provider::Google,
            &[(401, "{}"), (200, r#"{"access_token":"NEW"}"#), (200, "{}")],
            i64::MAX,
        );
        s.send(Method::Put, "https://api/x", None).unwrap();
        let sent = http.requests();
        assert_eq!(sent.len(), 3);
        assert_eq!(sent[2].bearer.as_deref(), Some("NEW"));
    }

    #[test]
    fn missing_tokens_mean_not_connected() {
        let (s, _) = session(Provider::Google, &[], 0);
        s.disconnect().unwrap();
        assert!(matches!(s.access_token(), Err(Error::NotConnected(_))));
    }
}
