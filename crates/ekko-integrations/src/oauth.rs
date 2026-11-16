//! OAuth 2 Authorization Code + PKCE: auth URL, code exchange and refresh.

use serde::Deserialize;
use url::Url;

use crate::http::{Method, Request, Transport};
use crate::tokens::Tokens;
use crate::{Error, Result};

#[derive(Debug, Clone)]
pub struct OAuthClient {
    pub auth_url: &'static str,
    pub token_url: &'static str,
    pub client_id: String,
    /// Only Google "Desktop app" clients need it; Spotify PKCE has none.
    pub client_secret: Option<String>,
    pub scopes: &'static [&'static str],
    /// Provider-specific auth params (e.g. Google `access_type=offline`).
    pub extra: &'static [(&'static str, &'static str)],
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

impl OAuthClient {
    pub fn authorize_url(&self, redirect_uri: &str, state: &str, challenge: &str) -> String {
        let mut url = Url::parse(self.auth_url).expect("static auth url");
        {
            let mut q = url.query_pairs_mut();
            q.append_pair("client_id", &self.client_id)
                .append_pair("response_type", "code")
                .append_pair("redirect_uri", redirect_uri)
                .append_pair("scope", &self.scopes.join(" "))
                .append_pair("state", state)
                .append_pair("code_challenge_method", "S256")
                .append_pair("code_challenge", challenge);
            for (k, v) in self.extra {
                q.append_pair(k, v);
            }
        }
        url.into()
    }

    pub fn exchange(
        &self,
        http: &dyn Transport,
        code: &str,
        verifier: &str,
        redirect_uri: &str,
        now_ms: i64,
    ) -> Result<Tokens> {
        let form = self.form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", redirect_uri),
            ("code_verifier", verifier),
        ]);
        self.token_request(http, form, now_ms, None)
    }

    /// Keeps the old refresh token when the provider doesn't rotate it (Google).
    pub fn refresh(&self, http: &dyn Transport, old: &Tokens, now_ms: i64) -> Result<Tokens> {
        let refresh = old
            .refresh
            .as_deref()
            .ok_or_else(|| Error::OAuth("sem refresh token; conecte de novo".into()))?;
        let form = self.form(&[("grant_type", "refresh_token"), ("refresh_token", refresh)]);
        let mut tokens = self.token_request(http, form, now_ms, old.refresh.clone())?;
        tokens.account.clone_from(&old.account);
        Ok(tokens)
    }

    fn form(&self, pairs: &[(&str, &str)]) -> Vec<(String, String)> {
        let mut form: Vec<(String, String)> = pairs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
            .collect();
        form.push(("client_id".into(), self.client_id.clone()));
        if let Some(secret) = &self.client_secret {
            form.push(("client_secret".into(), secret.clone()));
        }
        form
    }

    fn token_request(
        &self,
        http: &dyn Transport,
        form: Vec<(String, String)>,
        now_ms: i64,
        previous_refresh: Option<String>,
    ) -> Result<Tokens> {
        let mut req = Request::new(Method::Post, self.token_url);
        req.form = Some(form);
        let res = http.send(&req)?;
        if !res.ok() {
            return Err(res.error());
        }
        parse_tokens(&res.body, now_ms, previous_refresh)
    }
}

pub fn parse_tokens(body: &str, now_ms: i64, previous_refresh: Option<String>) -> Result<Tokens> {
    let parsed: TokenResponse =
        serde_json::from_str(body).map_err(|e| Error::Parse(format!("token: {e}")))?;
    Ok(Tokens {
        access: parsed.access_token,
        refresh: parsed.refresh_token.or(previous_refresh),
        // No expires_in: assume the common 1 h.
        expires_at: now_ms + parsed.expires_in.unwrap_or(3600) * 1000,
        account: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::FakeTransport;

    fn client(secret: Option<&str>) -> OAuthClient {
        OAuthClient {
            auth_url: "https://auth.example/authorize",
            token_url: "https://auth.example/token",
            client_id: "cid".into(),
            client_secret: secret.map(Into::into),
            scopes: &["a.read", "b.write"],
            extra: &[("access_type", "offline")],
        }
    }

    #[test]
    fn authorize_url_has_every_pkce_param() {
        let url = client(None).authorize_url("http://127.0.0.1:8890/callback", "st", "ch");
        let parsed = Url::parse(&url).unwrap();
        let q: std::collections::HashMap<_, _> = parsed.query_pairs().into_owned().collect();
        assert_eq!(q["client_id"], "cid");
        assert_eq!(q["response_type"], "code");
        assert_eq!(q["redirect_uri"], "http://127.0.0.1:8890/callback");
        assert_eq!(q["scope"], "a.read b.write");
        assert_eq!(q["state"], "st");
        assert_eq!(q["code_challenge_method"], "S256");
        assert_eq!(q["code_challenge"], "ch");
        assert_eq!(q["access_type"], "offline");
        assert!(url.contains("scope=a.read+b.write"));
    }

    #[test]
    fn exchange_posts_the_verifier_and_secret() {
        let http = FakeTransport::with(&[(
            200,
            r#"{"access_token":"A","refresh_token":"R","expires_in":3600}"#,
        )]);
        let t = client(Some("sec"))
            .exchange(&http, "code1", "ver", "http://x/cb", 1_000)
            .unwrap();
        assert_eq!((t.access.as_str(), t.refresh.as_deref()), ("A", Some("R")));
        assert_eq!(t.expires_at, 1_000 + 3_600_000);
        let form = http.requests()[0].form.clone().unwrap();
        for pair in [
            ("code_verifier", "ver"),
            ("code", "code1"),
            ("client_secret", "sec"),
        ] {
            assert!(form.contains(&(pair.0.into(), pair.1.into())), "{pair:?}");
        }
    }

    #[test]
    fn refresh_keeps_old_refresh_token_and_account() {
        let http = FakeTransport::with(&[(200, r#"{"access_token":"B","expires_in":60}"#)]);
        let old = Tokens {
            access: "A".into(),
            refresh: Some("R".into()),
            expires_at: 0,
            account: Some("gui".into()),
        };
        let t = client(None).refresh(&http, &old, 0).unwrap();
        assert_eq!(t.refresh.as_deref(), Some("R"));
        assert_eq!(t.account.as_deref(), Some("gui"));
        assert_eq!(t.expires_at, 60_000);
    }

    #[test]
    fn token_errors_surface_the_description() {
        let http = FakeTransport::with(&[(
            400,
            r#"{"error":"invalid_grant","error_description":"Invalid refresh token"}"#,
        )]);
        let old = Tokens {
            access: "A".into(),
            refresh: Some("R".into()),
            expires_at: 0,
            account: None,
        };
        let err = client(None).refresh(&http, &old, 0).unwrap_err();
        assert!(err.to_string().contains("Invalid refresh token"));
    }
}
