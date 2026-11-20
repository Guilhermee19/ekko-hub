//! Google Calendar (read-only): upcoming events from every calendar shown in the UI.

use chrono::{DateTime, Local, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use url::Url;

use crate::Result;
use crate::oauth::OAuthClient;
use crate::session::Session;

pub const SCOPES: &[&str] = &["https://www.googleapis.com/auth/calendar.readonly"];
const API: &str = "https://www.googleapis.com/calendar/v3";

/// Ekko's own Google client (id, secret), baked in at build time from
/// `EKKO_GOOGLE_CLIENT_ID` / `EKKO_GOOGLE_CLIENT_SECRET`, so people connect with one
/// click. None in builds without them: the user brings their own client. A "Desktop
/// app" secret is not confidential for Google, but it stays out of the repo anyway.
pub fn builtin_client() -> Option<(&'static str, &'static str)> {
    builtin(
        option_env!("EKKO_GOOGLE_CLIENT_ID"),
        option_env!("EKKO_GOOGLE_CLIENT_SECRET"),
    )
}

/// CI passes unset secrets as empty strings, so empty counts as missing.
fn builtin(
    id: Option<&'static str>,
    secret: Option<&'static str>,
) -> Option<(&'static str, &'static str)> {
    let (id, secret) = (id?.trim(), secret?.trim());
    (!id.is_empty() && !secret.is_empty()).then_some((id, secret))
}

/// "Desktop app" clients accept any loopback port and need the client secret.
pub fn oauth(client_id: &str, client_secret: Option<String>) -> OAuthClient {
    OAuthClient {
        auth_url: "https://accounts.google.com/o/oauth2/v2/auth",
        token_url: "https://oauth2.googleapis.com/token",
        client_id: client_id.to_owned(),
        client_secret,
        scopes: SCOPES,
        // offline + consent so Google always hands out a refresh token.
        extra: &[("access_type", "offline"), ("prompt", "consent")],
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub all_day: bool,
    pub location: Option<String>,
    pub meet_link: Option<String>,
    pub calendar_name: String,
}

/// The primary calendar id is the account e-mail.
pub fn account(s: &Session) -> Result<Option<String>> {
    let v = s
        .get(&format!("{API}/calendars/primary"))?
        .unwrap_or_default();
    Ok(v["id"].as_str().map(str::to_owned))
}

/// Events overlapping `[now, now + hours]`, sorted by start, from selected calendars.
pub fn upcoming(s: &Session, now_ms: i64, hours: i64) -> Result<Vec<CalendarEvent>> {
    let mut events = Vec::new();
    for (id, name) in calendars(s)? {
        let url = events_url(&id, now_ms, now_ms + hours * 3_600_000);
        let v = s.get(&url)?.unwrap_or_default();
        let items = v["items"].as_array().cloned().unwrap_or_default();
        events.extend(items.iter().filter_map(|e| parse_event(e, &name)));
    }
    events.retain(|e| e.end_ms > now_ms);
    events.sort_by_key(|e| (e.start_ms, e.end_ms));
    Ok(events)
}

/// (id, display name) of calendars checked in Google Calendar, primary first.
fn calendars(s: &Session) -> Result<Vec<(String, String)>> {
    let v = s.get(&format!("{API}/users/me/calendarList?minAccessRole=reader"))?;
    let items = v
        .as_ref()
        .and_then(|v| v["items"].as_array())
        .cloned()
        .unwrap_or_default();
    let mut list: Vec<(bool, String, String)> = items
        .iter()
        .filter(|c| {
            c["selected"].as_bool().unwrap_or(false) || c["primary"].as_bool() == Some(true)
        })
        .filter_map(|c| {
            let id = c["id"].as_str()?.to_owned();
            let name = c["summaryOverride"]
                .as_str()
                .or_else(|| c["summary"].as_str())
                .unwrap_or("Agenda")
                .to_owned();
            Some((c["primary"].as_bool() != Some(true), id, name))
        })
        .collect();
    list.sort();
    if list.is_empty() {
        return Ok(vec![("primary".into(), "Agenda".into())]);
    }
    Ok(list.into_iter().map(|(_, id, name)| (id, name)).collect())
}

pub fn events_url(calendar_id: &str, from_ms: i64, to_ms: i64) -> String {
    let mut url = Url::parse(API).expect("static api url");
    url.path_segments_mut()
        .expect("base url")
        .extend(["calendars", calendar_id, "events"]);
    url.query_pairs_mut()
        .append_pair("timeMin", &rfc3339(from_ms))
        .append_pair("timeMax", &rfc3339(to_ms))
        .append_pair("singleEvents", "true")
        .append_pair("orderBy", "startTime")
        .append_pair("maxResults", "50");
    url.into()
}

fn rfc3339(ms: i64) -> String {
    DateTime::<Utc>::from_timestamp_millis(ms)
        .unwrap_or_default()
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

pub fn parse_event(v: &Value, calendar_name: &str) -> Option<CalendarEvent> {
    if v["status"].as_str() == Some("cancelled") {
        return None;
    }
    let (start_ms, all_day) = parse_time(&v["start"])?;
    let (end_ms, _) = parse_time(&v["end"]).unwrap_or((start_ms, all_day));
    let video = v["conferenceData"]["entryPoints"]
        .as_array()
        .and_then(|eps| eps.iter().find(|e| e["entryPointType"] == "video"))
        .and_then(|e| e["uri"].as_str());
    Some(CalendarEvent {
        id: v["id"].as_str()?.to_owned(),
        title: v["summary"].as_str().unwrap_or("(sem título)").to_owned(),
        start_ms,
        end_ms,
        all_day,
        location: v["location"].as_str().map(str::to_owned),
        meet_link: v["hangoutLink"].as_str().or(video).map(str::to_owned),
        calendar_name: calendar_name.to_owned(),
    })
}

/// `{dateTime}` → instant; `{date}` (all-day) → local midnight of that day.
fn parse_time(v: &Value) -> Option<(i64, bool)> {
    if let Some(dt) = v["dateTime"].as_str() {
        return Some((
            DateTime::parse_from_rfc3339(dt).ok()?.timestamp_millis(),
            false,
        ));
    }
    let date = NaiveDate::parse_from_str(v["date"].as_str()?, "%Y-%m-%d").ok()?;
    let midnight = Local
        .from_local_datetime(&date.and_hms_opt(0, 0, 0)?)
        .earliest()?;
    Some((midnight.timestamp_millis(), true))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Provider;
    use crate::session::tests::session;

    const LIST: &str = r#"{"items":[
        {"id":"team@group.calendar.google.com","summary":"Time","selected":true},
        {"id":"gui@gmail.com","summary":"gui@gmail.com","summaryOverride":"Pessoal","primary":true,"selected":true},
        {"id":"hidden","summary":"Oculta","selected":false}]}"#;

    #[test]
    fn builtin_client_needs_both_values() {
        assert_eq!(builtin(Some(" id "), Some("sec")), Some(("id", "sec")));
        assert_eq!(builtin(Some("id"), None), None);
        assert_eq!(builtin(Some(""), Some("sec")), None);
        assert_eq!(builtin(Some("id"), Some("  ")), None);
    }

    #[test]
    fn parses_timed_and_all_day_events() {
        let timed: Value = serde_json::from_str(
            r#"{"id":"e1","summary":"Daily","hangoutLink":"https://meet.google.com/abc",
            "start":{"dateTime":"2026-11-15T10:00:00-03:00"},"end":{"dateTime":"2026-11-15T10:30:00-03:00"}}"#,
        )
        .unwrap();
        let e = parse_event(&timed, "Pessoal").unwrap();
        assert_eq!(e.end_ms - e.start_ms, 30 * 60_000);
        assert_eq!(e.start_ms, 1_794_747_600_000);
        assert_eq!(e.meet_link.as_deref(), Some("https://meet.google.com/abc"));
        assert!(!e.all_day);

        let day: Value = serde_json::from_str(
            r#"{"id":"e2","start":{"date":"2026-11-15"},"end":{"date":"2026-11-16"},
            "conferenceData":{"entryPoints":[{"entryPointType":"video","uri":"https://zoom.us/j/1"}]}}"#,
        )
        .unwrap();
        let d = parse_event(&day, "Pessoal").unwrap();
        assert!(d.all_day);
        assert_eq!(d.title, "(sem título)");
        assert_eq!(d.meet_link.as_deref(), Some("https://zoom.us/j/1"));

        let cancelled: Value = serde_json::from_str(r#"{"id":"x","status":"cancelled"}"#).unwrap();
        assert!(parse_event(&cancelled, "P").is_none());
    }

    #[test]
    fn events_url_escapes_the_calendar_id() {
        let url = events_url("a#b@group.calendar.google.com", 0, 3_600_000);
        assert!(url.contains("/calendars/a%23b@group.calendar.google.com/events?"));
        assert!(url.contains("timeMin=1970-01-01T00%3A00%3A00Z"));
        assert!(url.contains("singleEvents=true"));
    }

    #[test]
    fn upcoming_merges_selected_calendars_sorted() {
        let primary = r#"{"items":[
            {"id":"p1","summary":"Tarde","start":{"dateTime":"1970-01-01T05:00:00Z"},"end":{"dateTime":"1970-01-01T06:00:00Z"}},
            {"id":"old","summary":"Já foi","start":{"dateTime":"1970-01-01T00:00:00Z"},"end":{"dateTime":"1970-01-01T00:30:00Z"}}]}"#;
        let team = r#"{"items":[{"id":"t1","summary":"Cedo","start":{"dateTime":"1970-01-01T02:00:00Z"},"end":{"dateTime":"1970-01-01T03:00:00Z"}}]}"#;
        let (s, http) = session(
            Provider::Google,
            &[(200, LIST), (200, primary), (200, team)],
            i64::MAX,
        );
        let events = upcoming(&s, 3_600_000, 24).unwrap();
        let titles: Vec<_> = events.iter().map(|e| e.title.as_str()).collect();
        assert_eq!(titles, ["Cedo", "Tarde"]);
        assert_eq!(events[1].calendar_name, "Pessoal");
        let sent = http.requests();
        assert_eq!(sent.len(), 3, "hidden calendar must not be fetched");
        assert!(
            sent[1].url.contains("/calendars/gui@gmail.com/"),
            "primary first"
        );
    }
}
