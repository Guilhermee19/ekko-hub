//! Gmail (read-only): the latest inbox messages, headers and snippet only.
//! Shares the Google client of the Agenda, with its own consent and tokens.

use std::collections::{HashMap, HashSet};

use serde_json::Value;
use url::Url;

use super::{MailMessage, parse_from, unescape};
use crate::oauth::OAuthClient;
use crate::session::Session;
use crate::{Provider, Result};

pub const SCOPES: &[&str] = &["https://www.googleapis.com/auth/gmail.readonly"];
const API: &str = "https://gmail.googleapis.com/gmail/v1/users/me";
/// Gmail tabs that never deserve a notch alert.
const QUIET_LABELS: &[&str] = &["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL"];

/// Same "Desktop app" client as the Agenda (any loopback port, needs the secret).
pub fn oauth(client_id: &str, client_secret: Option<String>) -> OAuthClient {
    OAuthClient {
        auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
        token_url: "https://oauth2.googleapis.com/token",
        client_id: client_id.to_owned(),
        client_secret,
        scopes: SCOPES,
        extra: &[("access_type", "offline"), ("prompt", "consent")],
        token_scope: false,
    }
}

/// The linked address.
pub fn account(s: &Session) -> Result<Option<String>> {
    let v = s.get(&format!("{API}/profile"))?.unwrap_or_default();
    Ok(v["emailAddress"].as_str().map(str::to_owned))
}

/// Latest `limit` inbox messages, newest first. Headers never change, so messages in
/// `cache` are reused and only their unread flag is refreshed: two list calls a round,
/// plus one per message not seen before.
pub fn recent(
    s: &Session,
    account: &str,
    limit: usize,
    cache: &HashMap<String, MailMessage>,
) -> Result<Vec<MailMessage>> {
    let ids = list(s, &["INBOX"], limit)?;
    // Among the newest `limit` of the inbox, the unread ones are also among the newest
    // `limit` unread of the inbox.
    let unread: HashSet<String> = list(s, &["INBOX", "UNREAD"], limit)?.into_iter().collect();
    let mut out = Vec::with_capacity(ids.len());
    for id in ids {
        let mut m = match cache.get(&id) {
            Some(m) => m.clone(),
            None => match fetch(s, account, &id)? {
                Some(m) => m,
                None => continue,
            },
        };
        m.unread = unread.contains(&id);
        out.push(m);
    }
    out.sort_by_key(|m| std::cmp::Reverse(m.received_ms));
    Ok(out)
}

fn list(s: &Session, labels: &[&str], limit: usize) -> Result<Vec<String>> {
    let mut url = Url::parse(&format!("{API}/messages")).expect("static url");
    {
        let mut q = url.query_pairs_mut();
        for label in labels {
            q.append_pair("labelIds", label);
        }
        q.append_pair("maxResults", &limit.to_string());
    }
    let v = s.get(url.as_str())?.unwrap_or_default();
    Ok(v["messages"]
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|m| m["id"].as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default())
}

fn fetch(s: &Session, account: &str, id: &str) -> Result<Option<MailMessage>> {
    let url =
        format!("{API}/messages/{id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject");
    let v = s.get(&url)?.unwrap_or_default();
    Ok(parse_message(&v, account))
}

/// One `messages.get?format=metadata` response.
pub fn parse_message(v: &Value, account: &str) -> Option<MailMessage> {
    let id = v["id"].as_str()?.to_owned();
    let header = |name: &str| {
        v["payload"]["headers"]
            .as_array()
            .and_then(|hs| {
                hs.iter().find(|h| {
                    h["name"]
                        .as_str()
                        .is_some_and(|n| n.eq_ignore_ascii_case(name))
                })
            })
            .and_then(|h| h["value"].as_str())
            .unwrap_or_default()
            .to_owned()
    };
    let labels: Vec<&str> = v["labelIds"]
        .as_array()
        .map(|ls| ls.iter().filter_map(Value::as_str).collect())
        .unwrap_or_default();
    let (from_name, from_addr) = parse_from(&header("From"));
    let subject = header("Subject");
    Some(MailMessage {
        link: format!("https://mail.google.com/mail/u/{account}/#inbox/{id}"),
        id,
        provider: Provider::Gmail,
        account: account.to_owned(),
        from_name,
        from_addr,
        subject: if subject.trim().is_empty() {
            "(sem assunto)".into()
        } else {
            subject
        },
        snippet: unescape(v["snippet"].as_str().unwrap_or_default()),
        received_ms: v["internalDate"]
            .as_str()
            .and_then(|d| d.parse().ok())
            .unwrap_or_default(),
        unread: labels.contains(&"UNREAD"),
        quiet: labels.iter().any(|l| QUIET_LABELS.contains(l)),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::tests::session;

    const MESSAGE: &str = r#"{
        "id": "18c1",
        "labelIds": ["INBOX", "UNREAD", "CATEGORY_PERSONAL"],
        "snippet": "Segue a proposta &amp; o contrato",
        "internalDate": "1764240000000",
        "payload": { "headers": [
            { "name": "From", "value": "\"Ana Souza\" <ana@x.com>" },
            { "name": "Subject", "value": "Proposta" }
        ] }
    }"#;

    #[test]
    fn parses_metadata() {
        let v: Value = serde_json::from_str(MESSAGE).unwrap();
        let m = parse_message(&v, "eu@gmail.com").unwrap();
        assert_eq!(m.from_name, "Ana Souza");
        assert_eq!(m.subject, "Proposta");
        assert_eq!(m.snippet, "Segue a proposta & o contrato");
        assert_eq!(m.received_ms, 1_764_240_000_000);
        assert!(m.unread && !m.quiet);
        assert_eq!(
            m.link,
            "https://mail.google.com/mail/u/eu@gmail.com/#inbox/18c1"
        );
    }

    #[test]
    fn promotions_are_quiet() {
        let v: Value =
            serde_json::from_str(r#"{"id":"p","labelIds":["INBOX","CATEGORY_PROMOTIONS"]}"#)
                .unwrap();
        let m = parse_message(&v, "eu@gmail.com").unwrap();
        assert!(m.quiet && !m.unread);
        assert_eq!(m.subject, "(sem assunto)");
    }

    #[test]
    fn recent_reuses_cached_headers_and_refreshes_unread() {
        let (s, http) = session(
            Provider::Gmail,
            &[
                (200, r#"{"messages":[{"id":"18c1"},{"id":"new"}]}"#),
                (200, r#"{"messages":[{"id":"new"}]}"#),
                (
                    200,
                    r#"{"id":"new","internalDate":"5","labelIds":["INBOX","UNREAD"]}"#,
                ),
            ],
            i64::MAX,
        );
        let cached = parse_message(&serde_json::from_str(MESSAGE).unwrap(), "eu@gmail.com");
        let cache = HashMap::from([("18c1".to_owned(), cached.unwrap())]);
        let got = recent(&s, "eu@gmail.com", 20, &cache).unwrap();
        assert_eq!(http.requests().len(), 3);
        assert_eq!(got[0].id, "18c1");
        assert!(!got[0].unread, "read in the browser since the last round");
        assert!(got[1].unread);
        assert!(
            http.requests()[0]
                .url
                .contains("labelIds=INBOX&maxResults=20")
        );
    }
}
