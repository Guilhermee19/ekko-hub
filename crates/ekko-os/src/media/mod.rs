//! "Now playing" + transport controls for whatever reports to the OS media overlay
//! (Spotify desktop, YouTube/Spotify in a browser, any GSMTC-aware player). No login.

mod names;
mod thumb;
#[cfg(windows)]
mod gsmtc;

use serde::Serialize;

pub use names::friendly_app_name;
pub use thumb::{ThumbCache, data_url};

/// A meaningful position jump (seek, or a drift the UI clock can't explain).
pub const POSITION_JUMP_MS: u64 = 2_000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub album: String,
    /// Raw source id reported by the OS (e.g. `Spotify.exe`, `chrome`, an AUMID).
    pub app_id: String,
    /// Friendly name of `app_id` for the UI ("Spotify", "Chrome"...).
    pub source: String,
    pub playing: bool,
    pub position_ms: u64,
    pub duration_ms: u64,
    /// `data:image/...;base64,...`, read once per track.
    pub thumbnail: Option<String>,
}

impl NowPlaying {
    /// Same track, regardless of playback state or position.
    pub fn same_track(&self, other: &Self) -> bool {
        self.title == other.title
            && self.artist == other.artist
            && self.album == other.album
            && self.app_id == other.app_id
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MediaError {
    #[error("nenhum player ativo")]
    NoSession,
    #[error("o player recusou o comando")]
    Rejected,
    #[error("controle de mídia indisponível neste sistema")]
    Unsupported,
    #[error("erro do sistema: {0}")]
    Os(String),
}

pub type Result<T> = std::result::Result<T, MediaError>;

/// Platform-independent player access, so the service logic is testable.
pub trait MediaSource {
    fn current(&mut self) -> Option<NowPlaying>;
    fn play_pause(&mut self) -> Result<()>;
    fn next(&mut self) -> Result<()>;
    fn previous(&mut self) -> Result<()>;
    fn seek(&mut self, position_ms: u64) -> Result<()>;
}

/// The OS media source (GSMTC on Windows; nothing elsewhere). Keep one alive to reuse
/// the session manager and the thumbnail cache.
pub fn system_source() -> Box<dyn MediaSource + Send> {
    #[cfg(windows)]
    let source = gsmtc::GsmtcSource::default();
    #[cfg(not(windows))]
    let source = NullSource;
    Box::new(source)
}

pub fn current() -> Option<NowPlaying> {
    system_source().current()
}

pub fn play_pause() -> Result<()> {
    system_source().play_pause()
}

pub fn next() -> Result<()> {
    system_source().next()
}

pub fn previous() -> Result<()> {
    system_source().previous()
}

pub fn seek(position_ms: u64) -> Result<()> {
    system_source().seek(position_ms)
}

/// Source for platforms without a media overlay.
pub struct NullSource;

impl MediaSource for NullSource {
    fn current(&mut self) -> Option<NowPlaying> {
        None
    }
    fn play_pause(&mut self) -> Result<()> {
        Err(MediaError::Unsupported)
    }
    fn next(&mut self) -> Result<()> {
        Err(MediaError::Unsupported)
    }
    fn previous(&mut self) -> Result<()> {
        Err(MediaError::Unsupported)
    }
    fn seek(&mut self, _: u64) -> Result<()> {
        Err(MediaError::Unsupported)
    }
}

/// Whether `next` is worth telling the UI about, given the last value sent and how
/// long ago (ms). Position alone only counts when it jumps away from where the UI's
/// local clock would be.
pub fn changed(last: Option<&NowPlaying>, next: Option<&NowPlaying>, elapsed_ms: u64) -> bool {
    let (Some(a), Some(b)) = (last, next) else {
        return last.is_some() != next.is_some();
    };
    if !a.same_track(b)
        || a.playing != b.playing
        || a.duration_ms != b.duration_ms
        || a.thumbnail != b.thumbnail
    {
        return true;
    }
    let expected = extrapolate(a.position_ms, elapsed_ms, a.playing, a.duration_ms);
    expected.abs_diff(b.position_ms) > POSITION_JUMP_MS
}

/// Players report the position at `LastUpdatedTime`; while playing, add the time since.
pub fn extrapolate(position_ms: u64, since_update_ms: u64, playing: bool, duration_ms: u64) -> u64 {
    let pos = if playing { position_ms + since_update_ms } else { position_ms };
    if duration_ms > 0 { pos.min(duration_ms) } else { pos }
}

#[cfg(test)]
mod tests;
