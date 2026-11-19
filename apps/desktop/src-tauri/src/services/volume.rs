//! Mirrors the Windows master volume to every window (`VOLUME_CHANGED`), so sliders
//! follow changes made by the keyboard keys or the Windows flyout. Core Audio calls
//! block briefly, so polling runs on its own thread.

use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use ekko_os::volume::{self, VolumeState};
use tauri::{AppHandle, Emitter, Manager};

/// `VolumeState` whenever the level or mute changes.
pub const VOLUME_CHANGED: &str = "ekko://volume/changed";
// Fast enough that the volume keys flash the notch right away; reading is cheap.
const POLL: Duration = Duration::from_millis(250);

/// Last value sent to the UI (shared with the commands so they don't echo twice).
#[derive(Default)]
pub struct VolumeService {
    sent: Mutex<Option<VolumeState>>,
}

/// Emits `state` unless the UI already has it.
pub fn publish(app: &AppHandle, state: VolumeState) {
    let Some(service) = app.try_state::<VolumeService>() else {
        return;
    };
    let mut sent = service.sent.lock().expect("volume lock");
    if sent.is_some_and(|last| !last.differs(&state)) {
        return;
    }
    *sent = Some(state);
    let _ = app.emit(VOLUME_CHANGED, state);
}

pub fn spawn(app: &AppHandle) {
    app.manage(VolumeService::default());
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-volume".into())
        .spawn(move || {
            loop {
                if let Ok(state) = volume::get() {
                    publish(&app, state);
                }
                thread::sleep(POLL);
            }
        });
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o monitor de volume: {err}");
    }
}
