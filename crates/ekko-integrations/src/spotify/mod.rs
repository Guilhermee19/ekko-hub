//! Spotify Web API: playback state, queue, devices and remote control.

use serde::{Deserialize, Serialize};
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
        token_scope: false,
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

/// Spotify's repeat modes ("context" = the whole playlist/album).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Repeat {
    Off,
    Track,
    Context,
}

impl Repeat {
    pub fn as_str(self) -> &'static str {
        match self {
            Repeat::Off => "off",
            Repeat::Track => "track",
            Repeat::Context => "context",
        }
    }
}

pub fn set_shuffle(s: &Session, on: bool) -> Result<()> {
    player_put(s, &format!("shuffle?state={on}"))
}

pub fn set_repeat(s: &Session, mode: Repeat) -> Result<()> {
    player_put(s, &format!("repeat?state={}", mode.as_str()))
}

pub fn seek(s: &Session, position_ms: u64) -> Result<()> {
    player_put(s, &format!("seek?position_ms={position_ms}"))
}

/// Volume of the active device, 0..100 (clamped).
pub fn set_volume(s: &Session, percent: u8) -> Result<()> {
    player_put(s, &format!("volume?volume_percent={}", percent.min(100)))
}

fn player_put(s: &Session, path_and_query: &str) -> Result<()> {
    s.send(
        Method::Put,
        &format!("{API}/me/player/{path_and_query}"),
        None,
    )
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
mod tests;
