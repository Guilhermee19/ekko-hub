//! "Esconder em tela cheia": every second, checks whether the foreground app is
//! fullscreen on Ekko's monitor and hides the overlay surfaces until it leaves.

use std::thread;
use std::time::Duration;

use ekko_os::fullscreen::{self, ScreenRect};
use tauri::{AppHandle, Manager};

use crate::display::{
    self,
    windows::{self, DOCK, NOTCH, ORB, VOICE},
};
use crate::state::AppState;

const POLL: Duration = Duration::from_secs(1);
const OVERLAYS: [&str; 4] = [NOTCH, ORB, DOCK, VOICE];

/// Overlays this watcher hid (only those come back on exit).
#[derive(Default)]
struct Watch {
    active: bool,
    hidden: Vec<&'static str>,
}

pub fn spawn(app: &AppHandle) {
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-fullscreen".into())
        .spawn(move || {
            let mut watch = Watch::default();
            loop {
                thread::sleep(POLL);
                tick(&app, &mut watch);
            }
        });
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o detector de tela cheia: {err}");
    }
}

fn tick(app: &AppHandle, watch: &mut Watch) {
    let settings = app.state::<AppState>().settings();
    let hide = settings.general.hide_fullscreen
        && windows::monitor(app, settings.monitor).is_some_and(|m| {
            let r = windows::monitor_rect(&m);
            let ekko = ScreenRect::new(r.x, r.y, r.x + r.w, r.y + r.h);
            fullscreen::should_hide(fullscreen::foreground(), ekko, watch.active)
        });
    if hide == watch.active {
        return;
    }
    watch.active = hide;
    if hide {
        for label in OVERLAYS {
            if let Some(w) = app.get_webview_window(label)
                && w.is_visible().unwrap_or(false)
                && w.hide().is_ok()
            {
                watch.hidden.push(label);
            }
        }
    } else {
        // Only the current mode's surface returns (the mode may have changed meanwhile).
        let primary = display::primary_surface(settings.display_mode);
        for label in watch.hidden.drain(..) {
            if Some(label) == primary
                && let Some(w) = app.get_webview_window(label)
            {
                let _ = w.show();
            }
        }
    }
}
