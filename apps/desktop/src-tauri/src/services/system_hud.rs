//! The notch reacts to the PC: polls Caps Lock, mic mute, brightness, idle time and batteries on
//! its own thread and broadcasts what changed (`HUD_EVENT`), plus the battery levels
//! for the pill chip (`POWER_CHANGED`). Volume has its own monitor (`volume.rs`).

use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use ekko_core::hud::{HudTracker, Indicators, PowerSnapshot, Rest};
use ekko_os::{indicators, power, volume};
use tauri::{AppHandle, Emitter, Manager};

/// One `HudEvent` (tagged by `kind`).
pub const HUD_EVENT: &str = "ekko://hud";
/// Full `PowerSnapshot` whenever a level changes.
pub const POWER_CHANGED: &str = "ekko://power/changed";

const TICK: Duration = Duration::from_millis(120);
/// Mic and brightness every ~0.4 s, laptop battery every ~3 s, devices every ~12 s.
const SLOW: u32 = 3;
const POWER: u32 = 25;
const BLUETOOTH: u32 = 100;

#[derive(Default)]
pub struct PowerState(Mutex<PowerSnapshot>);

impl PowerState {
    pub fn get(&self) -> PowerSnapshot {
        self.0.lock().expect("power lock").clone()
    }
}

pub fn spawn(app: &AppHandle) {
    app.manage(PowerState::default());
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-hud".into())
        .spawn(move || run(&app));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o monitor do sistema: {err}");
    }
}

fn run(app: &AppHandle) {
    // WMI objects live on this thread.
    let brightness = indicators::BrightnessReader::new();
    let mut tracker = HudTracker::default();
    let mut now = Indicators::default();
    let mut snapshot = PowerSnapshot::default();
    let mut tick = 0u32;
    loop {
        now.caps_lock = indicators::caps_lock();
        if tick.is_multiple_of(SLOW) {
            now.mic_muted = volume::mic_muted();
            now.brightness = brightness.read();
            now.rest = Rest::from_idle(indicators::idle_secs());
        }
        let mut events = tracker.indicators(now);
        if tick.is_multiple_of(POWER) {
            let next = PowerSnapshot {
                battery: power::battery(),
                devices: if tick.is_multiple_of(BLUETOOTH) {
                    power::devices()
                } else {
                    snapshot.devices.clone()
                },
            };
            events.extend(tracker.power(&next));
            if next != snapshot || tick == 0 {
                snapshot = next;
                *app.state::<PowerState>().0.lock().expect("power lock") = snapshot.clone();
                let _ = app.emit(POWER_CHANGED, &snapshot);
            }
        }
        for e in events {
            let _ = app.emit(HUD_EVENT, e);
        }
        thread::sleep(TICK);
        // Wraps after ~16 years; the modulo schedule just restarts.
        tick = tick.wrapping_add(1);
    }
}
