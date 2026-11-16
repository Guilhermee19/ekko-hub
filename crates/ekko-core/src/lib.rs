//! Ekko domain core: types shared by every app (desktop now, server in v2).

pub mod appearance;
pub mod integrations;
pub mod intents;
pub mod notch;
pub mod pomodoro;
pub mod settings;
pub mod store;
pub mod timers;

pub use appearance::AppearanceSettings;
pub use integrations::IntegrationsSettings;
pub use notch::{NotchIdle, NotchOpen, NotchSettings, NotchSize};
pub use settings::{DisplayMode, DockSide, Persona, Settings};
