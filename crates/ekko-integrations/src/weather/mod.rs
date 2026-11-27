//! Weather from Open-Meteo (free, no key): the forecast for a city and the city search.
//! Rain warnings live in [`rain`].

pub mod rain;

use serde::{Deserialize, Serialize};
use url::Url;

use crate::http::{Method, Request, Transport};
use crate::{Error, Result};

pub use rain::{RainAlert, Severity, Watch};

const FORECAST: &str = "https://api.open-meteo.com/v1/forecast";
const GEOCODING: &str = "https://geocoding-api.open-meteo.com/v1/search";
const HOUR_MS: i64 = 3_600_000;
/// Hours kept in the forecast (the card and the warnings look this far).
pub const HOURS: usize = 24;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hour {
    /// Start of the hour, Unix ms.
    pub time_ms: i64,
    pub temp: f64,
    /// WMO weather code (0 clear … 95 thunderstorm).
    pub code: u8,
    pub precip_mm: f64,
    /// 0..=100; None when the model has no probability for that hour.
    pub probability: Option<u8>,
    pub gust_kmh: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Forecast {
    pub updated_ms: i64,
    pub temp: f64,
    pub feels_like: f64,
    pub code: u8,
    pub is_day: bool,
    /// Today's range.
    pub min: f64,
    pub max: f64,
    /// From the current hour on, up to [`HOURS`].
    pub hours: Vec<Hour>,
    /// The next heavy rain or storm in [`HOURS`], for the card.
    pub next_rain: Option<RainAlert>,
}

/// A search result; same shape as `ekko_core::weather::Place`.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoPlace {
    pub name: String,
    pub region: String,
    pub country: String,
    pub lat: f64,
    pub lon: f64,
}

pub fn forecast(http: &dyn Transport, lat: f64, lon: f64, now_ms: i64) -> Result<Forecast> {
    let url = Url::parse_with_params(
        FORECAST,
        [
            ("latitude", lat.to_string()),
            ("longitude", lon.to_string()),
            (
                "current",
                "temperature_2m,apparent_temperature,weather_code,is_day".into(),
            ),
            (
                "hourly",
                "temperature_2m,weather_code,precipitation,precipitation_probability,wind_gusts_10m"
                    .into(),
            ),
            ("daily", "temperature_2m_max,temperature_2m_min".into()),
            ("timezone", "auto".into()),
            ("timeformat", "unixtime".into()),
            ("forecast_days", "2".into()),
        ],
    )
    .map_err(|e| Error::Invalid(e.to_string()))?;
    let res = http.send(&Request::new(Method::Get, url.as_str()))?;
    if !res.ok() {
        return Err(res.error());
    }
    parse_forecast(&res.body, now_ms)
}

/// Cities matching `query` (at least 2 letters), best match first.
pub fn search(http: &dyn Transport, query: &str) -> Result<Vec<GeoPlace>> {
    let query = query.trim();
    if query.chars().count() < 2 {
        return Ok(Vec::new());
    }
    let url = Url::parse_with_params(
        GEOCODING,
        [
            ("name", query),
            ("count", "6"),
            ("language", "pt"),
            ("format", "json"),
        ],
    )
    .map_err(|e| Error::Invalid(e.to_string()))?;
    let res = http.send(&Request::new(Method::Get, url.as_str()))?;
    if !res.ok() {
        return Err(res.error());
    }
    parse_places(&res.body)
}

#[derive(Deserialize)]
struct RawForecast {
    current: RawCurrent,
    hourly: RawHourly,
    daily: RawDaily,
}

#[derive(Deserialize)]
struct RawCurrent {
    temperature_2m: Option<f64>,
    apparent_temperature: Option<f64>,
    weather_code: Option<f64>,
    is_day: Option<f64>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct RawHourly {
    time: Vec<i64>,
    temperature_2m: Vec<Option<f64>>,
    weather_code: Vec<Option<f64>>,
    precipitation: Vec<Option<f64>>,
    precipitation_probability: Vec<Option<f64>>,
    wind_gusts_10m: Vec<Option<f64>>,
}

#[derive(Deserialize, Default)]
#[serde(default)]
struct RawDaily {
    temperature_2m_max: Vec<Option<f64>>,
    temperature_2m_min: Vec<Option<f64>>,
}

fn at(values: &[Option<f64>], i: usize) -> Option<f64> {
    values.get(i).copied().flatten()
}

fn code(value: Option<f64>) -> u8 {
    value.map_or(0, |c| c.clamp(0.0, 99.0) as u8)
}

fn parse_forecast(body: &str, now_ms: i64) -> Result<Forecast> {
    let raw: RawForecast = serde_json::from_str(body).map_err(|e| Error::Parse(e.to_string()))?;
    let h = &raw.hourly;
    let hours: Vec<Hour> = h
        .time
        .iter()
        .enumerate()
        .map(|(i, secs)| Hour {
            time_ms: secs * 1000,
            temp: at(&h.temperature_2m, i).unwrap_or(0.0),
            code: code(at(&h.weather_code, i)),
            precip_mm: at(&h.precipitation, i).unwrap_or(0.0),
            probability: at(&h.precipitation_probability, i).map(|p| p.clamp(0.0, 100.0) as u8),
            gust_kmh: at(&h.wind_gusts_10m, i).unwrap_or(0.0),
        })
        .filter(|hour| hour.time_ms + HOUR_MS > now_ms)
        .take(HOURS)
        .collect();
    let c = &raw.current;
    let temp = c.temperature_2m.unwrap_or(0.0);
    let next_rain = rain::next_episode(&hours, now_ms, HOURS as i64 * HOUR_MS, Severity::HeavyRain);
    Ok(Forecast {
        updated_ms: now_ms,
        temp,
        feels_like: c.apparent_temperature.unwrap_or(temp),
        code: code(c.weather_code),
        is_day: c.is_day.is_none_or(|d| d >= 1.0),
        min: at(&raw.daily.temperature_2m_min, 0).unwrap_or(temp),
        max: at(&raw.daily.temperature_2m_max, 0).unwrap_or(temp),
        hours,
        next_rain,
    })
}

fn parse_places(body: &str) -> Result<Vec<GeoPlace>> {
    #[derive(Deserialize)]
    struct Raw {
        #[serde(default)]
        results: Vec<RawPlace>,
    }
    #[derive(Deserialize)]
    struct RawPlace {
        name: String,
        latitude: f64,
        longitude: f64,
        #[serde(default)]
        admin1: String,
        #[serde(default)]
        country: String,
    }
    let raw: Raw = serde_json::from_str(body).map_err(|e| Error::Parse(e.to_string()))?;
    Ok(raw
        .results
        .into_iter()
        .map(|p| GeoPlace {
            name: p.name,
            region: p.admin1,
            country: p.country,
            lat: p.latitude,
            lon: p.longitude,
        })
        .collect())
}

#[cfg(test)]
mod tests;
