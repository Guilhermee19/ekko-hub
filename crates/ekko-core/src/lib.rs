//! Ekko domain core: types shared by every app (desktop now, server in v2).

pub mod notch;
pub mod settings;
pub mod store;

pub use notch::{NotchIdle, NotchOpen, NotchSettings, NotchSize};
pub use settings::{DisplayMode, DockSide, Persona, Settings};
