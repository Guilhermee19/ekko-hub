//! User settings shared by the desktop app and the future server.

use serde::{Deserialize, Serialize};

use crate::appearance::AppearanceSettings;
use crate::general::GeneralSettings;
use crate::integrations::IntegrationsSettings;
use crate::notch::NotchSettings;
use crate::shortcuts::ShortcutSettings;
use crate::weather::WeatherSettings;

/// How Ekko shows up on the user's screen.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DisplayMode {
    /// Pill at the top of the screen that expands on hover (Kobi-style).
    #[default]
    Notch,
    /// Icon next to the clock; click opens a flyout above the taskbar.
    Tray,
    /// Draggable floating bubble.
    Orb,
    /// Thin strip on a screen edge that slides out.
    Dock,
    /// Large HUD window (Jarvis-style station).
    Hub,
    /// Nothing pinned; only hotkey / wake word with a transient overlay.
    VoiceOnly,
    /// Widget inside the Windows taskbar (FluentFlyout-style); click opens the panel.
    Taskbar,
}

impl DisplayMode {
    pub const ALL: [DisplayMode; 7] = [
        DisplayMode::Notch,
        DisplayMode::Tray,
        DisplayMode::Orb,
        DisplayMode::Dock,
        DisplayMode::Hub,
        DisplayMode::VoiceOnly,
        DisplayMode::Taskbar,
    ];

    /// Label shown in menus (pt-BR UI).
    pub fn label(self) -> &'static str {
        match self {
            DisplayMode::Notch => "Notch no topo",
            DisplayMode::Tray => "Bandeja (perto do relógio)",
            DisplayMode::Orb => "Bolha flutuante",
            DisplayMode::Dock => "Dock lateral",
            DisplayMode::Hub => "Central (HUD)",
            DisplayMode::VoiceOnly => "Só voz",
            DisplayMode::Taskbar => "Barra de tarefas",
        }
    }

    pub fn id(self) -> &'static str {
        match self {
            DisplayMode::Notch => "notch",
            DisplayMode::Tray => "tray",
            DisplayMode::Orb => "orb",
            DisplayMode::Dock => "dock",
            DisplayMode::Hub => "hub",
            DisplayMode::VoiceOnly => "voice-only",
            DisplayMode::Taskbar => "taskbar",
        }
    }

    pub fn from_id(id: &str) -> Option<Self> {
        Self::ALL.into_iter().find(|mode| mode.id() == id)
    }
}

/// Visual + voice + tone theme. Colors live in the frontend tokens.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Persona {
    #[default]
    Ekko,
    Ultron,
    /// Was "eco" until 21/11/2026; old settings files still load.
    #[serde(alias = "eco")]
    Tobby,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DockSide {
    Left,
    #[default]
    Right,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// Bumped when the shape changes, so old files can be migrated.
    pub version: u32,
    pub user_name: String,
    pub assistant_name: String,
    pub display_mode: DisplayMode,
    pub persona: Persona,
    pub dock_side: DockSide,
    /// Index of the monitor the notch/dock lives on (0 = primary).
    pub monitor: usize,
    pub orb_position: Option<(i32, i32)>,
    pub notch: NotchSettings,
    /// Accent override, notch look, pill content, panel scale (on top of the persona).
    pub appearance: AppearanceSettings,
    /// False until the welcome flow is finished (shown on first run).
    pub onboarded: bool,
    /// Developer app IDs for Spotify / Google (secrets live in the keyring).
    pub integrations: IntegrationsSettings,
    /// Autostart, hide in fullscreen, quiet hours, notification sound.
    pub general: GeneralSettings,
    /// Global shortcuts (re-registered by the desktop shell on change).
    pub shortcuts: ShortcutSettings,
    /// City and rain warnings for the "Clima" card.
    pub weather: WeatherSettings,
}

impl Settings {
    pub const CURRENT_VERSION: u32 = 1;
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: Self::CURRENT_VERSION,
            user_name: String::new(),
            assistant_name: "Ekko".into(),
            display_mode: DisplayMode::default(),
            persona: Persona::default(),
            dock_side: DockSide::default(),
            monitor: 0,
            orb_position: None,
            notch: NotchSettings::default(),
            appearance: AppearanceSettings::default(),
            onboarded: false,
            integrations: IntegrationsSettings::default(),
            general: GeneralSettings::default(),
            shortcuts: ShortcutSettings::default(),
            weather: WeatherSettings::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn old_eco_persona_loads_as_tobby() {
        let p: Persona = serde_json::from_str("\"eco\"").unwrap();
        assert_eq!(p, Persona::Tobby);
        assert_eq!(serde_json::to_string(&Persona::Tobby).unwrap(), "\"tobby\"");
    }

    #[test]
    fn display_mode_ids_round_trip() {
        for mode in DisplayMode::ALL {
            assert_eq!(DisplayMode::from_id(mode.id()), Some(mode));
        }
        assert_eq!(DisplayMode::from_id("nope"), None);
    }

    #[test]
    fn serde_ids_match_from_id() {
        for mode in DisplayMode::ALL {
            let json = serde_json::to_string(&mode).unwrap();
            assert_eq!(json, format!("\"{}\"", mode.id()));
        }
    }

    #[test]
    fn missing_fields_fall_back_to_defaults() {
        let parsed: Settings = serde_json::from_str(r#"{"displayMode":"orb"}"#).unwrap();
        assert_eq!(parsed.display_mode, DisplayMode::Orb);
        assert_eq!(parsed.assistant_name, "Ekko");
        assert_eq!(parsed.version, Settings::CURRENT_VERSION);
    }
}
