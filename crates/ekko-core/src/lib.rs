//! Ekko domain core: types shared by every app (desktop now, server in v2).

pub mod appearance;
pub mod audit;
pub mod capture;
pub mod clipboard;
pub mod clock;
pub mod general;
pub mod habits;
pub mod hud;
pub mod integrations;
pub mod intents;
pub mod notch;
pub mod panel_menu;
pub mod pomodoro;
pub mod productivity;
pub mod settings;
pub mod shelf;
pub mod shortcuts;
pub mod spectrum;
pub mod store;
pub mod tasks;
pub mod timers;

pub use appearance::AppearanceSettings;
pub use general::{DndSettings, GeneralSettings, NotifySound};
pub use integrations::IntegrationsSettings;
pub use notch::{NotchIdle, NotchOpen, NotchSettings, NotchSize};
pub use settings::{DisplayMode, DockSide, Persona, Settings};
pub use shortcuts::{ShortcutAction, ShortcutSettings};
