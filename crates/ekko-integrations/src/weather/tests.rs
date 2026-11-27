use super::rain::{Watch, next_episode, severity};
use super::*;
use crate::http::FakeTransport;

/// 2027-01-15 08:00 UTC, on the hour.
const NOW: i64 = 1_800_000_000_000;
const H: i64 = 3_600_000;

fn hour(offset: i64, code: u8, mm: f64, prob: Option<u8>) -> Hour {
    Hour {
        time_ms: NOW + offset * H,
        temp: 20.0,
        code,
        precip_mm: mm,
        probability: prob,
        gust_kmh: 30.0 + offset as f64,
    }
}

/// One hour in the past, then: clear, clear, heavy rain, storm, drizzle.
fn body() -> String {
    let t = NOW / 1000;
    format!(
        r#"{{
        "current": {{"time": {t}, "temperature_2m": 21.4, "apparent_temperature": 22.0,
                    "weather_code": 3, "is_day": 1}},
        "hourly": {{
            "time": [{}, {t}, {}, {}, {}, {}],
            "temperature_2m": [20, 21.4, 22, 21, 19, 18],
            "weather_code": [0, 3, 2, 65, 95, 51],
            "precipitation": [0, 0, 0, 9.5, 14, 0.3],
            "precipitation_probability": [0, 5, 10, 80, 90, null],
            "wind_gusts_10m": [10, 12, 15, 40, 65, 20]
        }},
        "daily": {{"temperature_2m_max": [27.1, 25], "temperature_2m_min": [17.2, 16]}}
    }}"#,
        t - 3600,
        t + 3600,
        t + 7200,
        t + 10800,
        t + 14400,
    )
}

#[test]
fn parses_the_forecast_from_the_current_hour() {
    let http = FakeTransport::with(&[(200, &body())]);
    let f = forecast(&http, -25.43, -49.27, NOW + 10 * 60_000).unwrap();
    assert_eq!(f.temp, 21.4);
    assert_eq!((f.min, f.max), (17.2, 27.1));
    assert!(f.is_day);
    assert_eq!(f.hours.len(), 5, "the past hour is dropped");
    assert_eq!(f.hours[0].time_ms, NOW);
    assert_eq!(f.hours[4].probability, None);
    let rain = f.next_rain.unwrap();
    assert_eq!(rain.severity, Severity::Storm);
    assert_eq!((rain.start_ms, rain.end_ms), (NOW + 2 * H, NOW + 4 * H));
    assert_eq!(rain.precip_mm, 23.5);
    assert_eq!(rain.probability, Some(90));
    assert_eq!(rain.gust_kmh, 65.0);

    let url = &http.requests()[0].url;
    assert!(url.starts_with("https://api.open-meteo.com/v1/forecast?latitude=-25.43"));
    assert!(url.contains("timeformat=unixtime"));
}

#[test]
fn api_errors_surface() {
    let http = FakeTransport::with(&[(400, r#"{"error":true,"reason":"bad"}"#)]);
    assert!(forecast(&http, 0.0, 0.0, NOW).is_err());
}

#[test]
fn searches_cities_and_skips_short_queries() {
    let http = FakeTransport::with(&[(
        200,
        r#"{"results":[{"name":"Curitiba","latitude":-25.42,"longitude":-49.27,
            "admin1":"Paraná","country":"Brasil"},{"name":"Curitibanos","latitude":-27.28,
            "longitude":-50.58,"country":"Brasil"}]}"#,
    )]);
    let found = search(&http, " curitiba ").unwrap();
    assert_eq!(found.len(), 2);
    assert_eq!(found[0].region, "Paraná");
    assert_eq!(found[1].region, "");
    assert!(http.requests()[0].url.contains("name=curitiba"));

    let none = FakeTransport::with(&[]);
    assert!(search(&none, "a").unwrap().is_empty());
    let empty = FakeTransport::with(&[(200, r#"{"generationtime_ms":0.2}"#)]);
    assert!(search(&empty, "zzzz").unwrap().is_empty());
}

#[test]
fn classifies_hours() {
    assert_eq!(severity(&hour(0, 95, 0.0, Some(70))), Some(Severity::Storm));
    assert_eq!(severity(&hour(0, 82, 0.0, None)), Some(Severity::HeavyRain));
    assert_eq!(
        severity(&hour(0, 61, 8.0, Some(60))),
        Some(Severity::HeavyRain)
    );
    assert_eq!(severity(&hour(0, 61, 3.0, Some(90))), None);
    assert_eq!(severity(&hour(0, 95, 0.0, Some(30))), None, "unlikely");
}

#[test]
fn finds_the_spell_within_the_lead_time() {
    let hours = [
        hour(0, 1, 0.0, Some(0)),
        hour(1, 2, 0.0, Some(10)),
        hour(2, 65, 9.0, Some(80)),
        hour(3, 65, 9.0, Some(80)),
        hour(4, 3, 0.0, Some(10)),
    ];
    assert!(next_episode(&hours, NOW, H, Severity::HeavyRain).is_none());
    let spell = next_episode(&hours, NOW, 2 * H, Severity::HeavyRain).unwrap();
    assert_eq!((spell.start_ms, spell.end_ms), (NOW + 2 * H, NOW + 4 * H));
    assert!(next_episode(&hours, NOW, 2 * H, Severity::Storm).is_none());
    // Already raining: the current hour counts.
    let spell = next_episode(&hours, NOW + 2 * H + 1, H, Severity::HeavyRain).unwrap();
    assert_eq!(spell.start_ms, NOW + 2 * H);
}

#[test]
fn warns_once_per_spell() {
    let spell = |start: i64, end: i64| RainAlert {
        severity: Severity::HeavyRain,
        start_ms: NOW + start * H,
        end_ms: NOW + end * H,
        precip_mm: 10.0,
        probability: Some(80),
        gust_kmh: 20.0,
    };
    let mut watch = Watch::default();
    assert!(watch.is_new(&spell(2, 4)));
    assert!(!watch.is_new(&spell(2, 4)), "same forecast again");
    assert!(!watch.is_new(&spell(3, 6)), "the spell moved a bit");
    assert!(watch.is_new(&spell(7, 8)), "a later spell");
    watch.reset();
    assert!(watch.is_new(&spell(7, 8)));
}
