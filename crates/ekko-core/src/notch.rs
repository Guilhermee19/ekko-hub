//! Notch customization: where it sits on the top edge and how it opens.

use serde::{Deserialize, Serialize};

/// Size of the expanded panel. The window canvas is the panel plus a margin for shadow.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotchSize {
    Compact,
    #[default]
    Normal,
    Large,
}

impl NotchSize {
    /// Expanded panel, logical px (mirrored in the frontend `notch/layout.ts`).
    pub fn panel(self) -> (f64, f64) {
        match self {
            NotchSize::Compact => (620.0, 440.0),
            NotchSize::Normal => (740.0, 520.0),
            NotchSize::Large => (880.0, 600.0),
        }
    }

    /// Transparent window canvas around the panel, logical px.
    pub fn canvas(self) -> (f64, f64) {
        let (w, h) = self.panel();
        (w + CANVAS_PAD.0, h + CANVAS_PAD.1)
    }
}

pub const CANVAS_PAD: (f64, f64) = (40.0, 40.0);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotchOpen {
    /// Expands after resting the mouse on it (Kobi-like).
    #[default]
    Hover,
    /// Only expands on click; never pops while passing by.
    Click,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NotchIdle {
    /// Pill with avatar and status.
    #[default]
    Pill,
    /// Thin line; grows into the pill when there is something to show.
    Minimal,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NotchSettings {
    /// Horizontal center as a fraction of the monitor width (0.5 = centered).
    pub offset: f64,
    pub size: NotchSize,
    pub open_on: NotchOpen,
    pub hover_delay_ms: u32,
    pub idle: NotchIdle,
}

impl NotchSettings {
    pub const MAX_HOVER_DELAY_MS: u32 = 1000;

    /// Values coming from the UI are clamped so a bad file can't hide the notch.
    pub fn sanitized(mut self) -> Self {
        self.offset = if self.offset.is_finite() {
            self.offset.clamp(0.0, 1.0)
        } else {
            0.5
        };
        self.hover_delay_ms = self.hover_delay_ms.min(Self::MAX_HOVER_DELAY_MS);
        self
    }
}

impl Default for NotchSettings {
    fn default() -> Self {
        Self {
            offset: 0.5,
            size: NotchSize::default(),
            open_on: NotchOpen::default(),
            hover_delay_ms: 180,
            idle: NotchIdle::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitized_clamps_out_of_range_values() {
        let s = NotchSettings {
            offset: 3.0,
            hover_delay_ms: 99_999,
            ..Default::default()
        }
        .sanitized();
        assert_eq!(s.offset, 1.0);
        assert_eq!(s.hover_delay_ms, NotchSettings::MAX_HOVER_DELAY_MS);
        let nan = NotchSettings {
            offset: f64::NAN,
            ..Default::default()
        };
        assert_eq!(nan.sanitized().offset, 0.5);
    }

    #[test]
    fn canvas_wraps_panel() {
        for size in [NotchSize::Compact, NotchSize::Normal, NotchSize::Large] {
            let (pw, ph) = size.panel();
            assert_eq!(size.canvas(), (pw + CANVAS_PAD.0, ph + CANVAS_PAD.1));
        }
    }
}
