//! "Clima" settings: the city to watch and when the notch warns about heavy rain.

use serde::{Deserialize, Serialize};

/// A city picked from the search (Open-Meteo geocoding).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Place {
    pub name: String,
    /// State or province ("Paraná"); empty when unknown.
    #[serde(default)]
    pub region: String,
    #[serde(default)]
    pub country: String,
    pub lat: f64,
    pub lon: f64,
}

/// What is worth a warning in the notch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RainLevel {
    /// Heavy rain and thunderstorms.
    #[default]
    HeavyRain,
    /// Only thunderstorms.
    Storm,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct WeatherSettings {
    pub place: Option<Place>,
    /// Warn in the notch (the card works either way).
    pub alerts: bool,
    /// How far ahead to warn, in hours.
    pub lead_hours: u32,
    pub level: RainLevel,
}

impl WeatherSettings {
    pub const MAX_LEAD_HOURS: u32 = 6;

    pub fn sanitized(mut self) -> Self {
        self.lead_hours = self.lead_hours.clamp(1, Self::MAX_LEAD_HOURS);
        self.place = self
            .place
            .filter(|p| (-90.0..=90.0).contains(&p.lat) && (-180.0..=180.0).contains(&p.lon));
        self
    }
}

impl Default for WeatherSettings {
    fn default() -> Self {
        Self {
            place: None,
            alerts: true,
            lead_hours: 2,
            level: RainLevel::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_and_serde_shape() {
        let parsed: WeatherSettings = serde_json::from_str("{}").unwrap();
        assert_eq!(parsed, WeatherSettings::default());
        let json = serde_json::to_value(WeatherSettings::default()).unwrap();
        assert_eq!(json["leadHours"], 2);
        assert_eq!(json["level"], "heavy-rain");
        assert!(json["place"].is_null());
    }

    #[test]
    fn sanitize_clamps_lead_and_drops_bad_places() {
        let w = WeatherSettings {
            lead_hours: 40,
            place: Some(Place {
                name: "X".into(),
                region: String::new(),
                country: String::new(),
                lat: 200.0,
                lon: 0.0,
            }),
            ..WeatherSettings::default()
        }
        .sanitized();
        assert_eq!(w.lead_hours, 6);
        assert!(w.place.is_none());
        let zero = WeatherSettings {
            lead_hours: 0,
            ..WeatherSettings::default()
        };
        assert_eq!(zero.sanitized().lead_hours, 1);
    }
}
