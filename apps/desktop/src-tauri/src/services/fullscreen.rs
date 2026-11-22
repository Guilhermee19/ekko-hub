//! "Esconder em tela cheia": every second, checks whether the foreground app is
//! fullscreen on Ekko's monitor and hides the overlay surfaces until it leaves.
//! The rest of the time it keeps Ekko above every other window: other always-on-top
//! windows (borderless games, players, other apps) would otherwise cover it once
//! they are activated. Alarms that fire while hidden wait for the way out.

use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use ekko_os::fullscreen::{self, ScreenRect};
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::display::{
    self,
    windows::{self, ALARM, CAPTURE, DOCK, NOTCH, ORB, PALETTE, PANEL, VOICE},
};
use crate::state::AppState;

const POLL: Duration = Duration::from_secs(1);
const OVERLAYS: [&str; 4] = [NOTCH, ORB, DOCK, VOICE];
/// Kept on top while visible, bottom to top: popups above the bar, the print and
/// eyedropper overlay above everything.
const ON_TOP: [&str; 8] = [NOTCH, ORB, DOCK, VOICE, PANEL, ALARM, PALETTE, CAPTURE];

/// True while a fullscreen app has Ekko hidden.
static HIDDEN: AtomicBool = AtomicBool::new(false);
/// Alarms that fired meanwhile; shown when the fullscreen app goes away.
static DEFERRED: Mutex<Vec<Value>> = Mutex::new(Vec::new());

/// Ekko is hidden for a fullscreen game or video ("Esconder em tela cheia").
pub fn hidden() -> bool {
    HIDDEN.load(Ordering::Relaxed)
}

/// Keeps an alarm for when the fullscreen app is gone (nothing shows over it).
pub fn defer_alarm(alarm: Value) {
    DEFERRED.lock().expect("deferred lock").push(alarm);
}

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
        if !hide {
            keep_on_top(app);
        }
        return;
    }
    watch.active = hide;
    HIDDEN.store(hide, Ordering::Relaxed);
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
        let waiting: Vec<Value> = DEFERRED.lock().expect("deferred lock").drain(..).collect();
        for alarm in waiting {
            if let Err(err) = display::flows::show_alarm(app, alarm) {
                eprintln!("[ekko] falha ao mostrar alarme adiado: {err}");
            }
        }
        keep_on_top(app);
    }
}

/// Re-asserts "always on top" for Ekko's visible windows, in `ON_TOP` order.
fn keep_on_top(app: &AppHandle) {
    let hwnds: Vec<isize> = ON_TOP
        .iter()
        .filter_map(|label| app.get_webview_window(label))
        .filter(|w| w.is_visible().unwrap_or(false))
        .filter_map(|w| w.hwnd().ok().map(|h| h.0 as isize))
        .collect();
    fullscreen::raise_topmost(&hwnds);
}
