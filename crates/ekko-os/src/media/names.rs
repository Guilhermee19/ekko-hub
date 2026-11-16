//! Source app id (exe name or AUMID) -> name a person recognizes.

/// Known players, matched as lowercase substrings of the app id. Order matters:
/// specific entries (PWAs, store apps) come before the browsers that host them.
const KNOWN: &[(&str, &str)] = &[
    // YouTube Music PWA (Chrome/Edge app id) and the th-ch desktop client.
    ("cinhimbnkkaeohfgghhklpknlkffjgod", "YouTube Music"),
    ("youtube-music", "YouTube Music"),
    ("youtubemusic", "YouTube Music"),
    ("spotify", "Spotify"),
    ("zunemusic", "Media Player"),
    ("zunevideo", "Filmes e TV"),
    ("applemusic", "Apple Music"),
    ("deezer", "Deezer"),
    ("tidal", "Tidal"),
    ("amazonmusic", "Amazon Music"),
    ("vlc", "VLC"),
    ("foobar2000", "foobar2000"),
    ("aimp", "AIMP"),
    ("musicbee", "MusicBee"),
    ("msedge", "Edge"),
    ("microsoftedge", "Edge"),
    ("chrome", "Chrome"),
    ("firefox", "Firefox"),
    // Firefox registers with this hashed AUMID on many installs.
    ("308046b0af4a39cb", "Firefox"),
    ("opera", "Opera"),
    ("brave", "Brave"),
    ("vivaldi", "Vivaldi"),
    ("arc", "Arc"),
];

pub fn friendly_app_name(app_id: &str) -> String {
    let lower = app_id.to_lowercase();
    if let Some((_, name)) = KNOWN.iter().find(|(key, _)| matches(&lower, key)) {
        return (*name).to_owned();
    }
    fallback(app_id)
}

/// Short keys must match a whole token, or "arc" would hit "search".
fn matches(lower: &str, key: &str) -> bool {
    if key.len() > 4 {
        return lower.contains(key);
    }
    lower
        .split(|c: char| !c.is_ascii_alphanumeric())
        .any(|token| token == key)
}

/// `Company.App_hash!Entry` / `C:\..\player.exe` -> "Player".
fn fallback(app_id: &str) -> String {
    let last = app_id.rsplit(['!', '\\', '/']).next().unwrap_or(app_id);
    let last = last.strip_suffix(".exe").or_else(|| last.strip_suffix(".EXE")).unwrap_or(last);
    let last = last.rsplit('.').next().unwrap_or(last);
    let mut chars = last.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => "Player".to_owned(),
    }
}
