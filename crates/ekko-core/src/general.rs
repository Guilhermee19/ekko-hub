//! "Geral" settings: start with Windows, hide in fullscreen, quiet hours and sounds.

use serde::{Deserialize, Serialize};

/// Synthesized notification tone (the frontend plays it with Web Audio; no files).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotifySound {
    None,
    #[default]
    Chime,
    Ping,
    Soft,
}

/// Quiet hours: toasts and sounds stay silent between `from` and `to` (local "HH:MM").
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DndSettings {
    pub enabled: bool,
    pub from: String,
    pub to: String,
}

impl Default for DndSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            from: "22:00".into(),
            to: "07:00".into(),
        }
    }
}

impl DndSettings {
    /// True when quiet hours cover `minute` (minutes since local midnight).
    /// `from == to` means never; a window like 22:00→07:00 crosses midnight.
    pub fn is_active_at(&self, minute: u16) -> bool {
        if !self.enabled {
            return false;
        }
        let (Some(from), Some(to)) = (parse_hhmm(&self.from), parse_hhmm(&self.to)) else {
            return false;
        };
        if from <= to {
            (from..to).contains(&minute)
        } else {
            minute >= from || minute < to
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GeneralSettings {
    /// Mirrors the OS state (Run registry key); the backend refreshes it on start.
    pub autostart: bool,
    /// Hide the overlay surfaces while another app is fullscreen on Ekko's monitor.
    pub hide_fullscreen: bool,
    pub dnd: DndSettings,
    pub sound: NotifySound,
    /// 0.0..=1.0
    pub volume: f32,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            autostart: false,
            hide_fullscreen: true,
            dnd: DndSettings::default(),
            sound: NotifySound::default(),
            volume: 0.6,
        }
    }
}

impl GeneralSettings {
    /// Clamps the volume and replaces malformed times with the defaults.
    pub fn sanitized(mut self) -> Self {
        self.volume = if self.volume.is_finite() {
            self.volume.clamp(0.0, 1.0)
        } else {
            Self::default().volume
        };
        let defaults = DndSettings::default();
        for (value, fallback) in [
            (&mut self.dnd.from, defaults.from),
            (&mut self.dnd.to, defaults.to),
        ] {
            match parse_hhmm(value) {
                Some(m) => *value = format!("{:02}:{:02}", m / 60, m % 60),
                None => *value = fallback,
            }
        }
        self
    }
}

/// "HH:MM" → minutes since midnight.
pub fn parse_hhmm(text: &str) -> Option<u16> {
    let (h, m) = text.trim().split_once(':')?;
    let (h, m): (u16, u16) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60).then_some(h * 60 + m)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dnd(from: &str, to: &str) -> DndSettings {
        DndSettings {
            enabled: true,
            from: from.into(),
            to: to.into(),
        }
    }

    #[test]
    fn parses_times() {
        assert_eq!(parse_hhmm("07:30"), Some(450));
        assert_eq!(parse_hhmm("7:05"), Some(425));
        assert_eq!(parse_hhmm("24:00"), None);
        assert_eq!(parse_hhmm("12:60"), None);
        assert_eq!(parse_hhmm("noon"), None);
    }

    #[test]
    fn same_day_window() {
        let d = dnd("13:00", "14:00");
        assert!(d.is_active_at(13 * 60));
        assert!(d.is_active_at(13 * 60 + 59));
        assert!(!d.is_active_at(14 * 60));
        assert!(!d.is_active_at(12 * 60 + 59));
    }

    #[test]
    fn window_crossing_midnight() {
        let d = dnd("22:00", "07:00");
        assert!(d.is_active_at(23 * 60));
        assert!(d.is_active_at(0));
        assert!(d.is_active_at(6 * 60 + 59));
        assert!(!d.is_active_at(7 * 60));
        assert!(!d.is_active_at(12 * 60));
    }

    #[test]
    fn disabled_or_empty_window_is_never_active() {
        let mut d = dnd("22:00", "07:00");
        d.enabled = false;
        assert!(!d.is_active_at(23 * 60));
        assert!(!dnd("08:00", "08:00").is_active_at(8 * 60));
        assert!(!dnd("bad", "07:00").is_active_at(0));
    }

    #[test]
    fn sanitize_fixes_volume_and_times() {
        let g = GeneralSettings {
            volume: 3.0,
            dnd: dnd("7:5", "oops"),
            ..GeneralSettings::default()
        }
        .sanitized();
        assert_eq!(g.volume, 1.0);
        assert_eq!(g.dnd.from, "07:05");
        assert_eq!(g.dnd.to, "07:00");
    }

    #[test]
    fn serde_shape() {
        let json = serde_json::to_value(GeneralSettings::default()).unwrap();
        assert_eq!(json["hideFullscreen"], true);
        assert_eq!(json["sound"], "chime");
        assert_eq!(json["dnd"]["from"], "22:00");
        let parsed: GeneralSettings = serde_json::from_str(r#"{"sound":"none"}"#).unwrap();
        assert_eq!(parsed.sound, NotifySound::None);
        assert!(parsed.hide_fullscreen);
    }
}
