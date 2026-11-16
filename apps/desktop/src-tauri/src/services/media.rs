//! Polls what Windows reports as playing (GSMTC) on its own thread and mirrors it to
//! every window via `MEDIA_CHANGED`. WinRT calls block on async ops, so they stay off
//! the UI thread; the transport commands also run here, in order.

use std::sync::Mutex;
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::thread;
use std::time::{Duration, Instant};

use ekko_os::media::{self, MediaSource, NowPlaying};
use tauri::{AppHandle, Emitter, Manager};

/// `Option<NowPlaying>` whenever something meaningful changed.
pub const MEDIA_CHANGED: &str = "ekko://media/changed";
const POLL: Duration = Duration::from_secs(1);
/// Re-read soon after a command: players apply it asynchronously.
const AFTER_COMMAND: Duration = Duration::from_millis(250);

#[derive(Debug, Clone, Copy)]
pub enum MediaCommand {
    PlayPause,
    Next,
    Previous,
}

/// Managed state: the latest value plus a line to the polling thread.
pub struct MediaService {
    latest: Mutex<Option<NowPlaying>>,
    commands: Mutex<Sender<MediaCommand>>,
}

impl MediaService {
    pub fn latest(&self) -> Option<NowPlaying> {
        self.latest.lock().expect("media lock").clone()
    }

    pub fn send(&self, command: MediaCommand) {
        let _ = self.commands.lock().expect("media lock").send(command);
    }
}

pub fn spawn(app: &AppHandle) {
    let (tx, rx) = mpsc::channel();
    app.manage(MediaService {
        latest: Mutex::new(None),
        commands: Mutex::new(tx),
    });
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-media".into())
        .spawn(move || run(&app, &rx));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o monitor de mídia: {err}");
    }
}

fn run(app: &AppHandle, commands: &Receiver<MediaCommand>) {
    let mut source = media::system_source();
    let mut sent: Option<NowPlaying> = None;
    let mut sent_at = Instant::now();
    let mut wait = Duration::ZERO;
    loop {
        match commands.recv_timeout(wait) {
            Ok(command) => {
                if let Err(err) = execute(source.as_mut(), command) {
                    eprintln!("[ekko] mídia {command:?}: {err}");
                }
                wait = AFTER_COMMAND;
                continue;
            }
            Err(RecvTimeoutError::Disconnected) => return,
            Err(RecvTimeoutError::Timeout) => {}
        }
        wait = POLL;
        let now = source.current();
        if let Some(service) = app.try_state::<MediaService>() {
            *service.latest.lock().expect("media lock") = now.clone();
        }
        let elapsed = u64::try_from(sent_at.elapsed().as_millis()).unwrap_or(u64::MAX);
        if media::changed(sent.as_ref(), now.as_ref(), elapsed) {
            let _ = app.emit(MEDIA_CHANGED, &now);
            sent = now;
            sent_at = Instant::now();
        }
    }
}

fn execute(source: &mut dyn MediaSource, command: MediaCommand) -> media::Result<()> {
    match command {
        MediaCommand::PlayPause => source.play_pause(),
        MediaCommand::Next => source.next(),
        MediaCommand::Previous => source.previous(),
    }
}
