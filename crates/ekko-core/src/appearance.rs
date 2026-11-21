//! Look customization on top of the persona: accent override, notch look, what the
//! pill shows, panel scale and the panel menu. The frontend turns this into CSS variables.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::panel_menu::{PanelMenu, tidy};

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

/// Outline around the notch, so its edges show on any wallpaper.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotchOutline {
    #[default]
    None,
    /// Thin accent line.
    Line,
    /// Accent light around it.
    Glow,
    /// Dark shadow (light wallpapers).
    Shadow,
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
    /// Battery of the laptop and of Bluetooth headsets, next to the clock.
    pub battery: bool,
    /// Quick flashes when Caps Lock, mic, brightness, volume or power change.
    pub system: bool,
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
            battery: true,
            system: true,
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
    pub notch_outline: NotchOutline,
    /// 0..1 strength of `notch_outline`.
    pub notch_outline_strength: f64,
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
    /// Cards on the home page, in order (ids from the frontend). `None` = default set;
    /// an empty list is a home the user cleared on purpose.
    pub home_cards: Option<Vec<String>>,
    /// Columns each home card takes (1..=4, the home is a 4-column grid); cards not
    /// listed use their default width.
    pub home_widths: BTreeMap<String, u8>,
    /// Holiday looks on Ekko in the notch (Santa hat and snow at Christmas, bunny at
    /// Easter…). On by default; some people would rather not.
    pub seasonal: bool,
}

impl AppearanceSettings {
    pub const RADIUS: (f64, f64) = (6.0, 28.0);
    pub const OPACITY: (f64, f64) = (0.6, 1.0);
    pub const GLOW: (f64, f64) = (0.0, 1.0);
    pub const SCALE: (f64, f64) = (0.85, 1.25);
    pub const FONT_SCALE: (f64, f64) = (0.9, 1.15);
    pub const OUTLINE: (f64, f64) = (0.0, 1.0);
    pub const HOME_COLUMNS: u8 = 4;

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
        self.notch_outline_strength = clamp(
            self.notch_outline_strength,
            Self::OUTLINE,
            d.notch_outline_strength,
        );
        let mut priority: Vec<PillItem> = Vec::with_capacity(PillItem::ALL.len());
        for item in self.pill_priority.into_iter().chain(PillItem::ALL) {
            if !priority.contains(&item) {
                priority.push(item);
            }
        }
        self.pill_priority = priority;
        self.panel_menu = self.panel_menu.sanitized();
        self.home_cards = self.home_cards.map(tidy);
        self.home_widths = self
            .home_widths
            .into_iter()
            .filter(|(id, _)| !id.is_empty() && id.len() <= 32)
            .take(64)
            .map(|(id, w)| (id, w.clamp(1, Self::HOME_COLUMNS)))
            .collect();
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
            notch_outline: NotchOutline::default(),
            notch_outline_strength: 0.5,
            pill_show: PillShow::default(),
            pill_priority: PillItem::ALL.to_vec(),
            font_scale: 1.0,
            reduce_motion: ReduceMotion::default(),
            avatar_style: AvatarStyle::default(),
            avatar_color: AvatarColor::default(),
            panel_menu: PanelMenu::default(),
            home_cards: None,
            home_widths: BTreeMap::new(),
            seasonal: true,
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
    fn seasonal_looks_are_on_for_older_files() {
        let old: AppearanceSettings = serde_json::from_str(r#"{"notchRadius": 12}"#).unwrap();
        assert!(old.seasonal);
        let off: AppearanceSettings = serde_json::from_str(r#"{"seasonal": false}"#).unwrap();
        assert!(!off.seasonal);
    }

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
    fn home_cards_keep_order_and_empty_differs_from_default() {
        let s = AppearanceSettings {
            home_cards: Some(vec!["music".into(), "music".into(), "pc".into()]),
            ..Default::default()
        }
        .sanitized();
        assert_eq!(s.home_cards, Some(vec!["music".into(), "pc".into()]));
        let cleared: AppearanceSettings = serde_json::from_str(r#"{"homeCards":[]}"#).unwrap();
        assert_eq!(cleared.home_cards, Some(vec![]));
        assert_eq!(AppearanceSettings::default().home_cards, None);
    }

    #[test]
    fn home_widths_stay_within_the_grid() {
        let s: AppearanceSettings =
            serde_json::from_str(r#"{"homeWidths":{"music":9,"pc":0,"tasks":2}}"#).unwrap();
        let s = s.sanitized();
        assert_eq!(s.home_widths["music"], 4);
        assert_eq!(s.home_widths["pc"], 1);
        assert_eq!(s.home_widths["tasks"], 2);
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
