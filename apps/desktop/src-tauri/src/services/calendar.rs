//! Google Calendar poller: refreshes upcoming events every 5 min (or on demand) and
//! nudges ~10 min before / at the start of each event.

use std::sync::Mutex;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::{Duration, Instant};

use ekko_integrations::reminders::Reminders;
use ekko_integrations::tokens;
use ekko_integrations::{CalendarEvent, Error, Provider, google_calendar, now_ms};
use tauri::{AppHandle, Emitter, Manager};

use super::integrations::{Integrations, session};

/// `CalendarEvent[]` (camelCase) whenever the list changes.
pub const CALENDAR_CHANGED: &str = "ekko://calendar/changed";
/// `{ event, phase: "soon" | "start", minutesLeft }`.
pub const CALENDAR_SOON: &str = "ekko://calendar/soon";
const REFRESH_EVERY: Duration = Duration::from_secs(5 * 60);
const TICK: Duration = Duration::from_secs(20);
const WINDOW_HOURS: i64 = 24;

pub struct Calendar {
    events: Mutex<Vec<CalendarEvent>>,
    wake: Mutex<Sender<()>>,
}

impl Calendar {
    pub fn events(&self) -> Vec<CalendarEvent> {
        self.events.lock().expect("calendar lock").clone()
    }
}

pub fn spawn(app: &AppHandle) {
    let (tx, rx) = mpsc::channel();
    app.manage(Calendar {
        events: Mutex::new(Vec::new()),
        wake: Mutex::new(tx),
    });
    let handle = app.clone();
    thread::spawn(move || {
        let app = handle;
        let mut reminders = Reminders::default();
        let mut last_fetch: Option<Instant> = None;
        loop {
            let woken = match rx.recv_timeout(TICK) {
                Ok(()) => true,
                Err(RecvTimeoutError::Timeout) => false,
                Err(RecvTimeoutError::Disconnected) => return,
            };
            if woken || last_fetch.is_none_or(|t| t.elapsed() >= REFRESH_EVERY) {
                last_fetch = Some(Instant::now());
                if let Err(err) = refresh(&app) {
                    eprintln!("[ekko] agenda: {err}");
                }
            }
            let events = app.state::<Calendar>().events();
            for reminder in reminders.due(&events, now_ms()) {
                let _ = app.emit(CALENDAR_SOON, &reminder);
            }
        }
    });
    request_refresh(app);
}

/// Asks the poller to fetch now (after connecting, for example).
pub fn request_refresh(app: &AppHandle) {
    let _ = app
        .state::<Calendar>()
        .wake
        .lock()
        .expect("wake lock")
        .send(());
}

/// Fetches events (blocking) and broadcasts them when they changed.
/// Not connected = empty list; network errors keep the last good list.
pub fn refresh(app: &AppHandle) -> Result<Vec<CalendarEvent>, Error> {
    let connected = tokens::load(app.state::<Integrations>().store(), Provider::Google)?.is_some();
    let events = if connected {
        let s = session(app, Provider::Google)?;
        google_calendar::upcoming(&s, now_ms(), WINDOW_HOURS)?
    } else {
        Vec::new()
    };
    publish(app, events.clone());
    Ok(events)
}

pub fn publish(app: &AppHandle, events: Vec<CalendarEvent>) {
    let state = app.state::<Calendar>();
    let mut current = state.events.lock().expect("calendar lock");
    if *current != events {
        *current = events;
        let _ = app.emit(CALENDAR_CHANGED, &*current);
    }
}
