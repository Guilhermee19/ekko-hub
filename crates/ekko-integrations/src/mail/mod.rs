//! E-mail, read-only: the latest inbox messages of Gmail and Outlook / Hotmail, and
//! which of them just arrived (for the notch). Only headers and a snippet are read.

pub mod gmail;
pub mod outlook;

use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::Provider;

/// How many inbox messages each account lists (and watches for new ones).
pub const RECENT: usize = 20;
/// The "already seen" ids are reset past this size (they only grow while running).
const MAX_SEEN: usize = 1000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailMessage {
    pub id: String,
    pub provider: Provider,
    /// The account's e-mail address.
    pub account: String,
    pub from_name: String,
    pub from_addr: String,
    pub subject: String,
    pub snippet: String,
    pub received_ms: i64,
    pub unread: bool,
    /// Promotions / social (Gmail) or "Outras" (Outlook): listed, never announced.
    pub quiet: bool,
    /// Opens the message in the provider's web app.
    pub link: String,
}

/// Tells which messages are new since the last look. The first look only learns what
/// is already there: the inbox at connect time is not news.
#[derive(Debug, Default)]
pub struct Inbox {
    seen: Option<HashSet<String>>,
}

impl Inbox {
    /// Unread, not-quiet messages never seen before, newest first.
    pub fn arrivals(&mut self, fresh: &[MailMessage]) -> Vec<MailMessage> {
        let Some(seen) = self.seen.as_mut() else {
            self.seen = Some(fresh.iter().map(|m| m.id.clone()).collect());
            return Vec::new();
        };
        let mut new: Vec<MailMessage> = fresh
            .iter()
            .filter(|m| m.unread && !m.quiet && !seen.contains(&m.id))
            .cloned()
            .collect();
        if seen.len() > MAX_SEEN {
            seen.clear();
        }
        seen.extend(fresh.iter().map(|m| m.id.clone()));
        new.sort_by_key(|m| std::cmp::Reverse(m.received_ms));
        new
    }
}

/// `"Ana Souza" <ana@x.com>` → ("Ana Souza", "ana@x.com"); a bare address names itself.
pub fn parse_from(raw: &str) -> (String, String) {
    let raw = raw.trim();
    if let (Some(open), Some(close)) = (raw.rfind('<'), raw.rfind('>'))
        && open < close
    {
        let addr = raw[open + 1..close].trim().to_owned();
        let name = raw[..open].trim().trim_matches('"').trim().to_owned();
        let name = if name.is_empty() { addr.clone() } else { name };
        return (name, addr);
    }
    (raw.to_owned(), raw.to_owned())
}

/// The few HTML entities Gmail puts in snippets.
pub(crate) fn unescape(text: &str) -> String {
    text.replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
}

#[cfg(test)]
mod tests {
    use super::*;

    pub(crate) fn msg(id: &str, received_ms: i64, unread: bool, quiet: bool) -> MailMessage {
        MailMessage {
            id: id.into(),
            provider: Provider::Gmail,
            account: "eu@gmail.com".into(),
            from_name: "Ana".into(),
            from_addr: "ana@x.com".into(),
            subject: "Oi".into(),
            snippet: String::new(),
            received_ms,
            unread,
            quiet,
            link: String::new(),
        }
    }

    #[test]
    fn first_look_announces_nothing() {
        let mut inbox = Inbox::default();
        assert!(inbox.arrivals(&[msg("a", 1, true, false)]).is_empty());
    }

    #[test]
    fn only_new_unread_and_not_quiet_messages_arrive() {
        let mut inbox = Inbox::default();
        inbox.arrivals(&[msg("a", 1, true, false)]);
        let fresh = [
            msg("a", 1, true, false),
            msg("b", 2, true, false),
            msg("c", 3, false, false),
            msg("d", 4, true, true),
            msg("e", 5, true, false),
        ];
        let ids: Vec<_> = inbox.arrivals(&fresh).into_iter().map(|m| m.id).collect();
        assert_eq!(ids, ["e", "b"]);
        assert!(inbox.arrivals(&fresh).is_empty());
    }

    #[test]
    fn from_header_forms() {
        let pair = |a: &str, b: &str| (a.to_owned(), b.to_owned());
        assert_eq!(
            parse_from("\"Ana Souza\" <ana@x.com>"),
            pair("Ana Souza", "ana@x.com")
        );
        assert_eq!(
            parse_from("Banco <no-reply@b.com>"),
            pair("Banco", "no-reply@b.com")
        );
        assert_eq!(parse_from("<a@b.com>"), pair("a@b.com", "a@b.com"));
        assert_eq!(parse_from("a@b.com"), pair("a@b.com", "a@b.com"));
    }

    #[test]
    fn snippet_entities_are_decoded() {
        assert_eq!(
            unescape("Tom &amp; Jerry&#39;s &quot;x&quot;"),
            "Tom & Jerry's \"x\""
        );
    }
}
