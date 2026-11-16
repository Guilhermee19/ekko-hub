//! Spotify Web API: playback state, queue, devices and remote control.

use serde::Serialize;
use serde_json::{Value, json};

use crate::Result;
use crate::http::Method;
use crate::oauth::OAuthClient;
use crate::session::Session;

/// Spotify needs the exact registered redirect URI, so its loopback port is fixed.
pub const REDIRECT_PORT: u16 = 8890;
pub const REDIRECT_URI: &str = "http://127.0.0.1:8890/callback";
pub const SCOPES: &[&str] = &[
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
];
const API: &str = "https://api.spotify.com/v1";

pub fn oauth(client_id: &str) -> OAuthClient {
    OAuthClient {
        auth_url: "https://accounts.spotify.com/authorize",
        token_url: "https://accounts.spotify.com/api/token",
        client_id: client_id.to_owned(),
        client_secret: None,
        scopes: SCOPES,
        extra: &[],
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: u64,
    pub cover_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyDevice {
    pub id: String,
    pub name: String,
    /// Lowercase Spotify type: "computer", "smartphone", "speaker", "tv"…
    pub kind: String,
    pub active: bool,
    pub volume: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyPlayback {
    pub playing: bool,
    pub progress_ms: u64,
    pub shuffle: bool,
    /// "off" | "track" | "context"
    pub repeat: String,
    pub track: Option<SpotifyTrack>,
    pub device: Option<SpotifyDevice>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotifyQueue {
    pub current: Option<SpotifyTrack>,
    pub queue: Vec<SpotifyTrack>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Control {
    Play,
    Pause,
    Next,
    Previous,
}

/// Display name of the linked account (falls back to the user id).
pub fn account(s: &Session) -> Result<Option<String>> {
    let me = s.get(&format!("{API}/me"))?.unwrap_or_default();
    Ok(text(&me, "display_name").or_else(|| text(&me, "id")))
}

/// `None` when nothing is playing on any device.
pub fn playback(s: &Session) -> Result<Option<SpotifyPlayback>> {
    Ok(s.get(&format!("{API}/me/player"))?
        .map(|v| parse_playback(&v)))
}

pub fn queue(s: &Session) -> Result<SpotifyQueue> {
    let v = s
        .get(&format!("{API}/me/player/queue"))?
        .unwrap_or_default();
    Ok(SpotifyQueue {
        current: v.get("currently_playing").and_then(parse_track),
        queue: list(&v, "queue").iter().filter_map(parse_track).collect(),
    })
}

pub fn devices(s: &Session) -> Result<Vec<SpotifyDevice>> {
    let v = s
        .get(&format!("{API}/me/player/devices"))?
        .unwrap_or_default();
    Ok(list(&v, "devices")
        .iter()
        .filter_map(parse_device)
        .collect())
}

pub fn transfer(s: &Session, device_id: &str, play: bool) -> Result<()> {
    let body = json!({ "device_ids": [device_id], "play": play });
    s.send(Method::Put, &format!("{API}/me/player"), Some(body))
}

pub fn control(s: &Session, action: Control) -> Result<()> {
    let (method, path) = match action {
        Control::Play => (Method::Put, "play"),
        Control::Pause => (Method::Put, "pause"),
        Control::Next => (Method::Post, "next"),
        Control::Previous => (Method::Post, "previous"),
    };
    s.send(method, &format!("{API}/me/player/{path}"), None)
}

fn text(v: &Value, key: &str) -> Option<String> {
    v.get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .map(str::to_owned)
}

fn list<'a>(v: &'a Value, key: &str) -> &'a [Value] {
    v.get(key)
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
}

pub fn parse_playback(v: &Value) -> SpotifyPlayback {
    SpotifyPlayback {
        playing: v["is_playing"].as_bool().unwrap_or(false),
        progress_ms: v["progress_ms"].as_u64().unwrap_or(0),
        shuffle: v["shuffle_state"].as_bool().unwrap_or(false),
        repeat: text(v, "repeat_state").unwrap_or_else(|| "off".into()),
        track: v.get("item").and_then(parse_track),
        device: v.get("device").and_then(parse_device),
    }
}

/// Tracks and podcast episodes share the fields we need.
pub fn parse_track(v: &Value) -> Option<SpotifyTrack> {
    let artists: Vec<&str> = list(v, "artists")
        .iter()
        .filter_map(|a| a["name"].as_str())
        .collect();
    let artist = if artists.is_empty() {
        v["show"]["name"].as_str().unwrap_or_default().to_owned()
    } else {
        artists.join(", ")
    };
    let images = if v["album"].is_object() {
        &v["album"]["images"]
    } else {
        &v["images"]
    };
    Some(SpotifyTrack {
        id: text(v, "id")?,
        title: text(v, "name").unwrap_or_default(),
        artist,
        album: v["album"]["name"].as_str().unwrap_or_default().to_owned(),
        duration_ms: v["duration_ms"].as_u64().unwrap_or(0),
        // Spotify lists images largest first.
        cover_url: images.get(0).and_then(|i| text(i, "url")),
    })
}

pub fn parse_device(v: &Value) -> Option<SpotifyDevice> {
    Some(SpotifyDevice {
        id: text(v, "id")?,
        name: text(v, "name").unwrap_or_default(),
        kind: text(v, "type").unwrap_or_default().to_lowercase(),
        active: v["is_active"].as_bool().unwrap_or(false),
        volume: v["volume_percent"].as_u64().map(|n| n.min(100) as u8),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Provider;
    use crate::session::tests::session;

    const PLAYER: &str = r#"{"is_playing":true,"progress_ms":1200,"shuffle_state":false,
      "repeat_state":"context",
      "device":{"id":"d1","name":"PC","type":"Computer","is_active":true,"volume_percent":70},
      "item":{"id":"t1","name":"Song","duration_ms":200000,"artists":[{"name":"A"},{"name":"B"}],
        "album":{"name":"Al","images":[{"url":"https://img/big"},{"url":"https://img/small"}]}}}"#;

    #[test]
    fn parses_the_player() {
        let p = parse_playback(&serde_json::from_str(PLAYER).unwrap());
        assert!(p.playing);
        assert_eq!(p.repeat, "context");
        let t = p.track.unwrap();
        assert_eq!(t.artist, "A, B");
        assert_eq!(t.cover_url.as_deref(), Some("https://img/big"));
        assert_eq!(p.device.unwrap().kind, "computer");
    }

    #[test]
    fn nothing_playing_is_none() {
        let (s, _) = session(Provider::Spotify, &[(204, "")], i64::MAX);
        assert!(playback(&s).unwrap().is_none());
    }

    #[test]
    fn devices_without_id_are_skipped() {
        let body = r#"{"devices":[{"id":null,"name":"Restrito","type":"TV"},
            {"id":"d2","name":"Celular","type":"Smartphone","is_active":false}]}"#;
        let (s, _) = session(Provider::Spotify, &[(200, body)], i64::MAX);
        let list = devices(&s).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].kind, "smartphone");
    }

    #[test]
    fn transfer_and_controls_hit_the_right_endpoints() {
        let (s, http) = session(
            Provider::Spotify,
            &[(204, ""), (204, ""), (204, "")],
            i64::MAX,
        );
        transfer(&s, "d2", true).unwrap();
        control(&s, Control::Next).unwrap();
        control(&s, Control::Pause).unwrap();
        let sent = http.requests();
        assert_eq!(sent[0].method, Method::Put);
        assert_eq!(sent[0].json.as_ref().unwrap()["device_ids"][0], "d2");
        assert!(sent[1].url.ends_with("/me/player/next"));
        assert_eq!(sent[1].method, Method::Post);
        assert!(sent[2].url.ends_with("/me/player/pause"));
        assert_eq!(sent[2].method, Method::Put);
    }

    #[test]
    fn queue_includes_current_and_upcoming() {
        let body = r#"{"currently_playing":{"id":"t1","name":"Now"},
            "queue":[{"id":"t2","name":"Next","show":{"name":"Pod"}}]}"#;
        let (s, _) = session(Provider::Spotify, &[(200, body)], i64::MAX);
        let q = queue(&s).unwrap();
        assert_eq!(q.current.unwrap().title, "Now");
        assert_eq!(q.queue[0].artist, "Pod");
    }
}
