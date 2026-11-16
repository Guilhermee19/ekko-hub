//! Windows Global System Media Transport Controls (the media overlay of the volume
//! flyout). WinRT async calls are awaited with `join()`, so call this off the UI
//! thread; windows-rs joins the MTA implicitly when COM isn't initialized.

use std::time::{SystemTime, UNIX_EPOCH};

use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as Manager,
    GlobalSystemMediaTransportControlsSessionMediaProperties as Properties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Storage::Streams::{Buffer, DataReader, InputStreamOptions};

use super::{
    MediaError, MediaSource, NowPlaying, Result, ThumbCache, data_url, extrapolate,
    friendly_app_name, thumb::MAX_THUMB_BYTES,
};

/// 100 ns ticks between 1601-01-01 (WinRT DateTime) and the Unix epoch.
const EPOCH_DIFF_TICKS: i64 = 116_444_736_000_000_000;
const TICKS_PER_MS: i64 = 10_000;

#[derive(Default)]
pub struct GsmtcSource {
    manager: Option<Manager>,
    thumbs: ThumbCache,
}

impl From<windows::core::Error> for MediaError {
    fn from(err: windows::core::Error) -> Self {
        MediaError::Os(err.message())
    }
}

impl GsmtcSource {
    fn session(&mut self) -> Result<Session> {
        let manager = match &self.manager {
            Some(m) => m.clone(),
            None => {
                let m = Manager::RequestAsync()?.join()?;
                self.manager = Some(m.clone());
                m
            }
        };
        // A null session (nothing playing) surfaces as an error in windows-rs.
        manager.GetCurrentSession().map_err(|_| MediaError::NoSession)
    }

    fn read(&mut self) -> Result<Option<NowPlaying>> {
        let session = self.session()?;
        let props = session.TryGetMediaPropertiesAsync()?.join()?;
        let title = props.Title()?.to_string_lossy();
        if title.trim().is_empty() {
            return Ok(None);
        }
        let artist = props.Artist()?.to_string_lossy();
        let app_id = session.SourceAppUserModelId()?.to_string_lossy();
        let playing = session.GetPlaybackInfo()?.PlaybackStatus()? == Status::Playing;

        let timeline = session.GetTimelineProperties()?;
        let start = timeline.StartTime()?.Duration;
        let duration_ms = ticks_to_ms(timeline.EndTime()?.Duration - start);
        let position_ms = ticks_to_ms(timeline.Position()?.Duration - start);
        let updated = timeline.LastUpdatedTime()?.UniversalTime;
        // Unknown update time (0) -> trust the raw position.
        let since_ms = if updated > 0 { ticks_to_ms(now_ticks() - updated) } else { 0 };

        let key = format!("{app_id}\u{1}{title}\u{1}{artist}");
        let thumbnail = self.thumbs.get_or_load(&key, || read_thumbnail(&props));
        Ok(Some(NowPlaying {
            album: props.AlbumTitle()?.to_string_lossy(),
            source: friendly_app_name(&app_id),
            position_ms: extrapolate(position_ms, since_ms, playing, duration_ms),
            title,
            artist,
            app_id,
            playing,
            duration_ms,
            thumbnail,
        }))
    }

    fn control(&mut self, run: impl FnOnce(&Session) -> windows::core::Result<bool>) -> Result<()> {
        let session = self.session()?;
        if run(&session)? { Ok(()) } else { Err(MediaError::Rejected) }
    }
}

impl MediaSource for GsmtcSource {
    fn current(&mut self) -> Option<NowPlaying> {
        match self.read() {
            Ok(now) => now,
            Err(MediaError::NoSession) => None,
            Err(_) => {
                // The manager may have died with Explorer; ask for a fresh one next time.
                self.manager = None;
                None
            }
        }
    }

    fn play_pause(&mut self) -> Result<()> {
        self.control(|s| s.TryTogglePlayPauseAsync()?.join())
    }

    fn next(&mut self) -> Result<()> {
        self.control(|s| s.TrySkipNextAsync()?.join())
    }

    fn previous(&mut self) -> Result<()> {
        self.control(|s| s.TrySkipPreviousAsync()?.join())
    }

    fn seek(&mut self, position_ms: u64) -> Result<()> {
        let ticks = i64::try_from(position_ms).unwrap_or(i64::MAX / TICKS_PER_MS) * TICKS_PER_MS;
        self.control(|s| s.TryChangePlaybackPositionAsync(ticks)?.join())
    }
}

fn read_thumbnail(props: &Properties) -> Option<String> {
    let stream = props.Thumbnail().ok()?.OpenReadAsync().ok()?.join().ok()?;
    let size = usize::try_from(stream.Size().ok()?).ok()?;
    if size == 0 || size > MAX_THUMB_BYTES {
        return None;
    }
    let len = u32::try_from(size).ok()?;
    let buffer = Buffer::Create(len).ok()?;
    let filled = stream.ReadAsync(&buffer, len, InputStreamOptions::None).ok()?.join().ok()?;
    let mut bytes = vec![0u8; usize::try_from(filled.Length().ok()?).ok()?];
    DataReader::FromBuffer(&filled).ok()?.ReadBytes(&mut bytes).ok()?;
    let content_type = stream.ContentType().map(|h| h.to_string_lossy()).unwrap_or_default();
    data_url(&bytes, &content_type)
}

fn ticks_to_ms(ticks: i64) -> u64 {
    u64::try_from(ticks.max(0) / TICKS_PER_MS).unwrap_or(0)
}

fn now_ticks() -> i64 {
    let since_unix = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    i64::try_from(since_unix.as_nanos() / 100).unwrap_or(0) + EPOCH_DIFF_TICKS
}
