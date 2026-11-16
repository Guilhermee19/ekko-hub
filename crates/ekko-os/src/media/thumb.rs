//! Album art: read once per track, kept as a data URL.

use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;

/// Bigger images are skipped: the URL travels in every change event.
pub const MAX_THUMB_BYTES: usize = 384 * 1024;

/// Retries while a player still shows no art (or the previous track's art, a known
/// GSMTC lag right after a track change). After that, whatever was read sticks.
const MAX_ATTEMPTS: u8 = 3;

/// One-entry cache keyed by track (title + artist).
#[derive(Debug, Default)]
pub struct ThumbCache {
    key: String,
    value: Option<String>,
    previous: Option<String>,
    attempts: u8,
}

impl ThumbCache {
    pub fn get_or_load(
        &mut self,
        key: &str,
        load: impl FnOnce() -> Option<String>,
    ) -> Option<String> {
        if key != self.key {
            self.previous = self.value.take().or(self.previous.take());
            self.key = key.to_owned();
            self.attempts = 0;
        }
        let settled = self.attempts >= MAX_ATTEMPTS;
        let stale = self.value.is_some() && self.value == self.previous;
        if settled || (self.value.is_some() && !stale) {
            return self.value.clone();
        }
        self.attempts += 1;
        self.value = load();
        self.value.clone()
    }
}

/// Encodes image bytes; the mime comes from the magic bytes, then the player's hint.
pub fn data_url(bytes: &[u8], content_type: &str) -> Option<String> {
    if bytes.is_empty() || bytes.len() > MAX_THUMB_BYTES {
        return None;
    }
    let mime = sniff(bytes)
        .or_else(|| content_type.starts_with("image/").then_some(content_type))
        .unwrap_or("image/png");
    Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

fn sniff(bytes: &[u8]) -> Option<&'static str> {
    match bytes {
        [0xFF, 0xD8, 0xFF, ..] => Some("image/jpeg"),
        [0x89, b'P', b'N', b'G', ..] => Some("image/png"),
        [b'G', b'I', b'F', b'8', ..] => Some("image/gif"),
        [
            b'R',
            b'I',
            b'F',
            b'F',
            _,
            _,
            _,
            _,
            b'W',
            b'E',
            b'B',
            b'P',
            ..,
        ] => Some("image/webp"),
        [b'B', b'M', ..] => Some("image/bmp"),
        _ => None,
    }
}
