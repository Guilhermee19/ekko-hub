//! Look customization on top of the persona: accent override, notch look, what the
//! pill shows, panel scale and the panel menu. The frontend turns this into CSS variables.

use serde::{Deserialize, Serialize};

use crate::panel_menu::PanelMenu;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SurfaceTone {
    /// Persona palette as is.
    #[default]
    Default,
    /// Deeper blacks for the base and surfaces.
    Darker,
    /// Base and surfaces lightly tinted with the accent.
    Tinted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ReduceMotion {
    /// Follow the Windows "animation effects" setting.
    #[default]
    System,
    On,
    Off,
}

/// Live activities that compete for the pill; the first active one in the list wins.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PillItem {
    Timer,
    Event,
    Music,
}

impl PillItem {
    pub const ALL: [PillItem; 3] = [PillItem::Timer, PillItem::Event, PillItem::Music];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AvatarStyle {
    #[default]
    Pill,
    Round,
    Line,
    Pixel,
    Visor,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AvatarColor {
    #[default]
    Accent,
    Strong,
    Neutral,
}

/// Which pieces the collapsed pill may show.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PillShow {
    pub avatar: bool,
    pub status_dot: bool,
    pub clock: bool,
    pub timer: bool,
    pub music: bool,
    pub event: bool,
}

impl Default for PillShow {
    fn default() -> Self {
        Self {
            avatar: true,
            status_dot: true,
            clock: false,
            timer: true,
            music: true,
            event: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppearanceSettings {
    /// Custom `#rrggbb` accent; `None` keeps the persona accent.
    pub accent: Option<String>,
    pub surface_tone: SurfaceTone,
    /// Bottom corner radius of the pill, px.
    pub notch_radius: f64,
    /// Pill background alpha.
    pub notch_opacity: f64,
    /// Accent border/glow intensity.
    pub notch_glow: f64,
    /// Pill size multiplier (box and content).
    pub notch_scale: f64,
    pub notch_border: bool,
    pub pill_show: PillShow,
    /// Always holds every `PillItem` exactly once after `sanitized()`.
    pub pill_priority: Vec<PillItem>,
    /// Text/UI scale of the full windows (hub, settings, panel).
    pub font_scale: f64,
    pub reduce_motion: ReduceMotion,
    pub avatar_style: AvatarStyle,
    pub avatar_color: AvatarColor,
    /// Pages in the panel menu and their order.
    pub panel_menu: PanelMenu,
}

impl AppearanceSettings {
    pub const RADIUS: (f64, f64) = (6.0, 28.0);
    pub const OPACITY: (f64, f64) = (0.6, 1.0);
    pub const GLOW: (f64, f64) = (0.0, 1.0);
    pub const SCALE: (f64, f64) = (0.85, 1.25);
    pub const FONT_SCALE: (f64, f64) = (0.9, 1.15);

    /// Clamps numbers, drops an invalid accent and repairs the priority list, so a
    /// hand-edited file can never make the notch invisible.
    pub fn sanitized(mut self) -> Self {
        let d = Self::default();
        self.accent = self.accent.as_deref().and_then(normalize_hex);
        self.notch_radius = clamp(self.notch_radius, Self::RADIUS, d.notch_radius);
        self.notch_opacity = clamp(self.notch_opacity, Self::OPACITY, d.notch_opacity);
        self.notch_glow = clamp(self.notch_glow, Self::GLOW, d.notch_glow);
        self.notch_scale = clamp(self.notch_scale, Self::SCALE, d.notch_scale);
        self.font_scale = clamp(self.font_scale, Self::FONT_SCALE, d.font_scale);
        let mut priority: Vec<PillItem> = Vec::with_capacity(PillItem::ALL.len());
        for item in self.pill_priority.into_iter().chain(PillItem::ALL) {
            if !priority.contains(&item) {
                priority.push(item);
            }
        }
        self.pill_priority = priority;
        self.panel_menu = self.panel_menu.sanitized();
        self
    }
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            accent: None,
            surface_tone: SurfaceTone::default(),
            notch_radius: 18.0,
            notch_opacity: 1.0,
            notch_glow: 0.25,
            notch_scale: 1.0,
            notch_border: true,
            pill_show: PillShow::default(),
            pill_priority: PillItem::ALL.to_vec(),
            font_scale: 1.0,
            reduce_motion: ReduceMotion::default(),
            avatar_style: AvatarStyle::default(),
            avatar_color: AvatarColor::default(),
            panel_menu: PanelMenu::default(),
        }
    }
}

fn clamp(value: f64, (min, max): (f64, f64), fallback: f64) -> f64 {
    if value.is_finite() {
        value.clamp(min, max)
    } else {
        fallback
    }
}

/// `#RRGGBB` / `rrggbb` → `#rrggbb`; anything else is rejected.
fn normalize_hex(raw: &str) -> Option<String> {
    let hex = raw.trim().trim_start_matches('#');
    (hex.len() == 6 && hex.chars().all(|c| c.is_ascii_hexdigit()))
        .then(|| format!("#{}", hex.to_ascii_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accent_is_normalized_or_dropped() {
        let ok = |a: &str| {
            AppearanceSettings {
                accent: Some(a.into()),
                ..Default::default()
            }
            .sanitized()
            .accent
        };
        assert_eq!(ok("#5EC8FF"), Some("#5ec8ff".into()));
        assert_eq!(ok(" a1b2c3 "), Some("#a1b2c3".into()));
        assert_eq!(ok("#fff"), None);
        assert_eq!(ok("red"), None);
        assert_eq!(ok("#zzzzzz"), None);
    }

    #[test]
    fn numbers_are_clamped_and_nan_falls_back() {
        let s = AppearanceSettings {
            notch_radius: 100.0,
            notch_opacity: 0.0,
            notch_glow: f64::NAN,
            notch_scale: 9.0,
            font_scale: -1.0,
            ..Default::default()
        }
        .sanitized();
        assert_eq!(s.notch_radius, 28.0);
        assert_eq!(s.notch_opacity, 0.6);
        assert_eq!(s.notch_glow, 0.25);
        assert_eq!(s.notch_scale, 1.25);
        assert_eq!(s.font_scale, 0.9);
    }

    #[test]
    fn priority_is_deduped_and_completed() {
        let s = AppearanceSettings {
            pill_priority: vec![PillItem::Music, PillItem::Music],
            ..Default::default()
        }
        .sanitized();
        assert_eq!(
            s.pill_priority,
            vec![PillItem::Music, PillItem::Timer, PillItem::Event]
        );
    }

    #[test]
    fn missing_fields_use_defaults_and_ids_are_kebab() {
        let s: AppearanceSettings =
            serde_json::from_str(r#"{"surfaceTone":"tinted","pillShow":{"clock":true}}"#).unwrap();
        assert_eq!(s.surface_tone, SurfaceTone::Tinted);
        assert!(s.pill_show.clock && s.pill_show.avatar);
        assert_eq!(s.notch_radius, 18.0);
        let json = serde_json::to_value(AppearanceSettings::default()).unwrap();
        assert_eq!(json["pillPriority"][0], "timer");
        assert_eq!(json["reduceMotion"], "system");
        assert_eq!(json["avatarColor"], "accent");
    }
}
