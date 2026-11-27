//! Weather poller: the forecast for the chosen city every 30 min (Open-Meteo, no key)
//! and one notch warning per heavy-rain spell coming up within the lead time.

use std::sync::Mutex;
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::{Duration, Instant};

use ekko_core::weather::{Place, RainLevel, WeatherSettings};
use ekko_integrations::weather::{self, Forecast, RainAlert, Severity, Watch};
use ekko_integrations::{Error, now_ms};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::integrations::Integrations;
use crate::state::AppState;

/// `Forecast | null` whenever it changes.
pub const WEATHER_CHANGED: &str = "ekko://weather/changed";
/// `{ alert: RainAlert, place }`: a new heavy-rain spell within the lead time.
pub const WEATHER_ALERT: &str = "ekko://weather/alert";
const REFRESH_EVERY: Duration = Duration::from_secs(30 * 60);
/// How often settings are re-read (a new city fetches right away).
const TICK: Duration = Duration::from_secs(60);

pub struct Weather {
    forecast: Mutex<Option<Forecast>>,
    wake: Mutex<Sender<()>>,
}

impl Weather {
    pub fn forecast(&self) -> Option<Forecast> {
        self.forecast.lock().expect("weather lock").clone()
    }
}

#[derive(Clone, Serialize)]
struct AlertPayload<'a> {
    alert: &'a RainAlert,
    place: &'a str,
}

pub fn spawn(app: &AppHandle) {
    let (tx, rx) = mpsc::channel();
    app.manage(Weather {
        forecast: Mutex::new(None),
        wake: Mutex::new(tx),
    });
    let app = app.clone();
    thread::spawn(move || {
        let mut last: Option<(Instant, (f64, f64))> = None;
        let mut watch = Watch::default();
        loop {
            let settings = app.state::<AppState>().settings().weather;
            let key = settings.place.as_ref().map(|p| (p.lat, p.lon));
            let moved = last.map(|(_, k)| Some(k)) != Some(key);
            let stale = last.is_none_or(|(t, _)| t.elapsed() >= REFRESH_EVERY);
            if moved {
                watch.reset();
            }
            match &settings.place {
                None => {
                    publish(&app, None);
                    last = None;
                }
                Some(place) if moved || stale => match fetch(&app, place) {
                    Ok(f) => {
                        last = Some((Instant::now(), (place.lat, place.lon)));
                        publish(&app, Some(f));
                    }
                    Err(err) => eprintln!("[ekko] clima: {err}"),
                },
                Some(_) => {}
            }
            warn(&app, &settings, &mut watch);
            match rx.recv_timeout(TICK) {
                Ok(()) => last = None,
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return,
            }
        }
    });
}

/// Fetch now (after picking a city or the refresh button).
pub fn request_refresh(app: &AppHandle) {
    let _ = app
        .state::<Weather>()
        .wake
        .lock()
        .expect("wake lock")
        .send(());
}

fn fetch(app: &AppHandle, place: &Place) -> Result<Forecast, Error> {
    let http = app.state::<Integrations>().http()?;
    weather::forecast(http.as_ref(), place.lat, place.lon, now_ms())
}

fn publish(app: &AppHandle, forecast: Option<Forecast>) {
    let state = app.state::<Weather>();
    let mut current = state.forecast.lock().expect("weather lock");
    if *current != forecast {
        *current = forecast;
        let _ = app.emit(WEATHER_CHANGED, &*current);
    }
}

/// Checked every tick, so the lead time is honored between fetches too.
fn warn(app: &AppHandle, settings: &WeatherSettings, watch: &mut Watch) {
    let (Some(place), true) = (&settings.place, settings.alerts) else {
        return;
    };
    let Some(forecast) = app.state::<Weather>().forecast() else {
        return;
    };
    let min = match settings.level {
        RainLevel::HeavyRain => Severity::HeavyRain,
        RainLevel::Storm => Severity::Storm,
    };
    let lead_ms = i64::from(settings.lead_hours) * 3_600_000;
    let Some(alert) = weather::rain::next_episode(&forecast.hours, now_ms(), lead_ms, min) else {
        return;
    };
    if watch.is_new(&alert) {
        let payload = AlertPayload {
            alert: &alert,
            place: &place.name,
        };
        let _ = app.emit(WEATHER_ALERT, payload);
    }
}
