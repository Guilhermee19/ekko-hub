//! "Clima": the forecast, the city search and the settings.

use ekko_core::WeatherSettings;
use ekko_integrations::weather::{self, Forecast, GeoPlace};
use tauri::{AppHandle, Manager, State};

use super::integrations::blocking;
use super::settings::broadcast;
use crate::services::integrations::Integrations;
use crate::services::weather::{self as service, Weather};
use crate::state::AppState;

#[tauri::command]
pub fn weather_forecast(state: State<'_, Weather>) -> Option<Forecast> {
    state.forecast()
}

#[tauri::command]
pub fn weather_refresh(app: AppHandle) {
    service::request_refresh(&app);
}

#[tauri::command]
pub async fn weather_search(app: AppHandle, query: String) -> Result<Vec<GeoPlace>, String> {
    blocking(&app, move |app| {
        let http = app.state::<Integrations>().http()?;
        weather::search(http.as_ref(), &query)
    })
    .await
}

#[tauri::command]
pub fn set_weather(app: AppHandle, weather: WeatherSettings) {
    let before = app.state::<AppState>().settings().weather.place;
    let settings = app
        .state::<AppState>()
        .update(|s| s.weather = weather.sanitized());
    broadcast(&app, &settings);
    if settings.weather.place != before {
        service::request_refresh(&app);
    }
}
