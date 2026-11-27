//! Outlook / Hotmail (read-only) through Microsoft Graph: the latest inbox messages.
//! Personal Microsoft accounts only (`consumers`); public client with PKCE, no secret.

use chrono::DateTime;
use serde_json::Value;

use super::{MailMessage, parse_from};
use crate::oauth::OAuthClient;
use crate::session::Session;
use crate::{Provider, Result};

pub const SCOPES: &[&str] = &["offline_access", "User.Read", "Mail.Read"];
const GRAPH: &str = "https://graph.microsoft.com/v1.0/me";
const FIELDS: &str =
    "id,subject,from,bodyPreview,receivedDateTime,isRead,inferenceClassification,webLink";

/// Ekko's own Entra app, baked in at build time from `EKKO_MS_CLIENT_ID`; None in
/// builds without it (the user registers their own app).
pub fn builtin_client() -> Option<&'static str> {
    option_env!("EKKO_MS_CLIENT_ID")
        .map(str::trim)
        .filter(|id| !id.is_empty())
}

pub fn oauth(client_id: &str) -> OAuthClient {
    OAuthClient {
        auth_url: "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
        token_url: "https://login.microsoftonline.com/consumers/oauth2/v2.0/token",
        client_id: client_id.to_owned(),
        client_secret: None,
        scopes: SCOPES,
        extra: &[("prompt", "select_account")],
        token_scope: true,
    }
}

/// The linked address.
pub fn account(s: &Session) -> Result<Option<String>> {
    let v = s.get(GRAPH)?.unwrap_or_default();
    Ok(v["mail"]
        .as_str()
        .or_else(|| v["userPrincipalName"].as_str())
        .map(str::to_owned))
}

/// Latest `limit` inbox messages, newest first, in one call.
pub fn recent(s: &Session, account: &str, limit: usize) -> Result<Vec<MailMessage>> {
    // Built by hand: Graph wants the `$` of OData options as is.
    let url = format!(
        "{GRAPH}/mailFolders/inbox/messages?$top={limit}&$select={FIELDS}&$orderby=receivedDateTime%20desc"
    );
    let v = s.get(&url)?.unwrap_or_default();
    Ok(v["value"]
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|m| parse_message(m, account))
                .collect()
        })
        .unwrap_or_default())
}

/// One message from the Graph list.
pub fn parse_message(v: &Value, account: &str) -> Option<MailMessage> {
    let id = v["id"].as_str()?.to_owned();
    let sender = &v["from"]["emailAddress"];
    let addr = sender["address"].as_str().unwrap_or_default();
    let (from_name, from_addr) = match sender["name"].as_str().filter(|n| !n.trim().is_empty()) {
        Some(name) => (name.trim().to_owned(), addr.to_owned()),
        None => parse_from(addr),
    };
    let subject = v["subject"].as_str().unwrap_or_default().trim();
    Some(MailMessage {
        id,
        provider: Provider::Outlook,
        account: account.to_owned(),
        from_name,
        from_addr,
        subject: if subject.is_empty() {
            "(sem assunto)".into()
        } else {
            subject.to_owned()
        },
        snippet: v["bodyPreview"]
            .as_str()
            .unwrap_or_default()
            .trim()
            .to_owned(),
        received_ms: v["receivedDateTime"]
            .as_str()
            .and_then(|d| DateTime::parse_from_rfc3339(d).ok())
            .map(|d| d.timestamp_millis())
            .unwrap_or_default(),
        unread: v["isRead"] == Value::Bool(false),
        quiet: v["inferenceClassification"].as_str() == Some("other"),
        link: v["webLink"].as_str().unwrap_or_default().to_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::tests::session;

    const LIST: &str = r#"{"value":[
        {
            "id": "AAMk1",
            "subject": "Sua fatura chegou",
            "from": { "emailAddress": { "name": "Banco", "address": "fatura@banco.com" } },
            "bodyPreview": "  Vencimento dia 10 ",
            "receivedDateTime": "2026-11-27T10:00:00Z",
            "isRead": false,
            "inferenceClassification": "focused",
            "webLink": "https://outlook.live.com/owa/?ItemID=AAMk1"
        },
        {
            "id": "AAMk2",
            "subject": "",
            "from": { "emailAddress": { "address": "news@loja.com" } },
            "isRead": true,
            "inferenceClassification": "other"
        }
    ]}"#;

    #[test]
    fn parses_the_inbox_list() {
        let (s, http) = session(Provider::Outlook, &[(200, LIST)], i64::MAX);
        let got = recent(&s, "eu@hotmail.com", 20).unwrap();
        let url = &http.requests()[0].url;
        assert!(url.contains("/mailFolders/inbox/messages?$top=20&$select="));
        assert_eq!(got.len(), 2);
        let first = &got[0];
        assert_eq!(
            (first.from_name.as_str(), first.subject.as_str()),
            ("Banco", "Sua fatura chegou")
        );
        assert_eq!(first.snippet, "Vencimento dia 10");
        assert_eq!(first.received_ms, 1_795_773_600_000);
        assert!(first.unread && !first.quiet);
        assert_eq!(first.link, "https://outlook.live.com/owa/?ItemID=AAMk1");
        let second = &got[1];
        assert_eq!(second.from_name, "news@loja.com");
        assert_eq!(second.subject, "(sem assunto)");
        assert!(second.quiet && !second.unread);
    }

    #[test]
    fn token_requests_carry_the_scopes() {
        let client = oauth("cid");
        assert!(client.token_scope && client.client_secret.is_none());
        assert!(
            client
                .authorize_url("http://127.0.0.1:1/callback", "s", "c")
                .contains("Mail.Read")
        );
    }
}
