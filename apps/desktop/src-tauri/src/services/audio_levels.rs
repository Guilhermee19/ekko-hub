//! Music visualizer feed: while Windows reports something playing, captures the PC's
//! audio output (loopback, never stored) and emits bar heights ~30 times a second.
//! Idle otherwise, so silence costs nothing.

use std::ops::ControlFlow;
use std::thread;
use std::time::{Duration, Instant};

use ekko_core::spectrum::{BANDS_HZ, Spectrum};
use ekko_os::loopback::{self, LoopbackError};
use tauri::{AppHandle, Emitter, Manager};

use super::media::MediaService;

/// `Vec<f32>` of bar heights (0..1), bass first.
pub const AUDIO_LEVELS: &str = "ekko://audio/levels";
const FRAME: Duration = Duration::from_millis(33);
const CHECK_PLAYING: Duration = Duration::from_millis(500);
const IDLE: Duration = Duration::from_millis(500);
const RETRY: Duration = Duration::from_secs(2);

pub fn spawn(app: &AppHandle) {
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-audio-levels".into())
        .spawn(move || run(&app));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o visualizador de música: {err}");
    }
}

fn playing(app: &AppHandle) -> bool {
    app.try_state::<MediaService>()
        .and_then(|m| m.latest())
        .is_some_and(|now| now.playing)
}

fn run(app: &AppHandle) {
    loop {
        if !playing(app) {
            thread::sleep(IDLE);
            continue;
        }
        let result = follow(app);
        let _ = app.emit(AUDIO_LEVELS, vec![0.0f32; BANDS_HZ.len()]);
        match result {
            Ok(()) | Err(LoopbackError::DeviceChanged) => {}
            Err(err) => {
                eprintln!("[ekko] visualizador de música: {err}");
                thread::sleep(RETRY);
            }
        }
    }
}

/// Captures until the music stops (Ok) or the device fails/changes (Err).
fn follow(app: &AppHandle) -> Result<(), LoopbackError> {
    let mut spectrum: Option<(u32, Spectrum)> = None;
    let mut framed = Instant::now();
    let mut checked = Instant::now();
    loopback::capture(&mut |samples, rate| {
        let (_, s) = match &mut spectrum {
            Some(entry) if entry.0 == rate => entry,
            slot => slot.insert((rate, Spectrum::new(rate))),
        };
        s.push(samples);
        if framed.elapsed() >= FRAME {
            framed = Instant::now();
            let _ = app.emit(AUDIO_LEVELS, s.frame());
        }
        if checked.elapsed() >= CHECK_PLAYING {
            checked = Instant::now();
            if !playing(app) {
                return ControlFlow::Break(());
            }
        }
        ControlFlow::Continue(())
    })
}
