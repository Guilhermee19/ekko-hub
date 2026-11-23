//! Color picker ("Pegar uma cor"): reads pixels from the frozen screen, formats them
//! (HEX, RGB, HSL) and keeps the last picks. Pure: the shell captures and stores.

use serde::{Deserialize, Serialize};

use crate::capture::Frame;

/// Unpinned colors kept in the history; pinned ones never fall off.
pub const HISTORY_MAX: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Rgb {
    /// "#3fe0c5" or "3FE0C5" → Rgb; None for anything else (no short or alpha forms).
    pub fn from_hex(text: &str) -> Option<Self> {
        let digits = text.trim().trim_start_matches('#');
        if digits.len() != 6 || !digits.bytes().all(|b| b.is_ascii_hexdigit()) {
            return None;
        }
        let byte = |i: usize| u8::from_str_radix(&digits[i..i + 2], 16).ok();
        Some(Self {
            r: byte(0)?,
            g: byte(2)?,
            b: byte(4)?,
        })
    }

    /// "#3fe0c5"
    pub fn hex(self) -> String {
        format!("#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
    }

    /// "rgb(63, 224, 197)"
    pub fn css_rgb(self) -> String {
        format!("rgb({}, {}, {})", self.r, self.g, self.b)
    }

    /// "hsl(170, 72%, 56%)", rounded like design tools show it.
    pub fn css_hsl(self) -> String {
        let (r, g, b) = (
            f64::from(self.r) / 255.0,
            f64::from(self.g) / 255.0,
            f64::from(self.b) / 255.0,
        );
        let max = r.max(g).max(b);
        let min = r.min(g).min(b);
        let l = (max + min) / 2.0;
        let d = max - min;
        let (h, s) = if d == 0.0 {
            (0.0, 0.0)
        } else {
            let s = d / (1.0 - (2.0 * l - 1.0).abs());
            let h = if max == r {
                60.0 * (((g - b) / d).rem_euclid(6.0))
            } else if max == g {
                60.0 * ((b - r) / d + 2.0)
            } else {
                60.0 * ((r - g) / d + 4.0)
            };
            (h, s)
        };
        format!(
            "hsl({}, {}%, {}%)",
            h.round() as u32 % 360,
            (s * 100.0).round(),
            (l * 100.0).round()
        )
    }
}

/// One pick, as the UI shows it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedColor {
    pub hex: String,
    pub rgb: String,
    pub hsl: String,
    /// Unix ms.
    pub at: u64,
    /// Survives the cap and "Limpar". Missing in files saved before pins existed.
    #[serde(default)]
    pub pinned: bool,
}

impl PickedColor {
    pub fn new(c: Rgb, at: u64) -> Self {
        Self {
            hex: c.hex(),
            rgb: c.css_rgb(),
            hsl: c.css_hsl(),
            at,
            pinned: false,
        }
    }
}

/// The pixel at (x, y) of the frozen frame (BGRA rows).
pub fn pixel(frame: &Frame, x: u32, y: u32) -> Option<Rgb> {
    if x >= frame.width || y >= frame.height {
        return None;
    }
    let i = ((y * frame.width + x) * 4) as usize;
    let p = frame.bgra.get(i..i + 4)?;
    Some(Rgb {
        r: p[2],
        g: p[1],
        b: p[0],
    })
}

/// The (2r+1)² pixels around (x, y), row by row, for the loupe; None off the screen.
pub fn around(frame: &Frame, x: u32, y: u32, r: u32) -> Vec<Option<String>> {
    let (x, y, r) = (i64::from(x), i64::from(y), i64::from(r));
    let mut out = Vec::with_capacity(((2 * r + 1) * (2 * r + 1)) as usize);
    for yy in y - r..=y + r {
        for xx in x - r..=x + r {
            let p = (xx >= 0 && yy >= 0)
                .then(|| pixel(frame, xx as u32, yy as u32))
                .flatten();
            out.push(p.map(Rgb::hex));
        }
    }
    out
}

/// Last picks, newest first. Picking a color again moves it to the front.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ColorHistory {
    pub colors: Vec<PickedColor>,
}

impl ColorHistory {
    /// Adds at the front; a color already there moves up and keeps its pin.
    pub fn add(&mut self, mut c: PickedColor) {
        if let Some(i) = self.colors.iter().position(|x| x.hex == c.hex) {
            c.pinned |= self.colors.remove(i).pinned;
        }
        self.colors.insert(0, c);
        self.trim();
    }

    pub fn remove(&mut self, hex: &str) {
        self.colors.retain(|x| x.hex != hex);
    }

    pub fn set_pinned(&mut self, hex: &str, pinned: bool) {
        if let Some(c) = self.colors.iter_mut().find(|c| c.hex == hex) {
            c.pinned = pinned;
        }
        self.trim();
    }

    /// "Limpar": everything but the pinned colors.
    pub fn clear(&mut self) {
        self.colors.retain(|c| c.pinned);
    }

    /// Drops the oldest unpinned colors past the cap.
    fn trim(&mut self) {
        let mut unpinned = 0;
        self.colors.retain(|c| {
            unpinned += usize::from(!c.pinned);
            c.pinned || unpinned <= HISTORY_MAX
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame() -> Frame {
        // 2×2: red, green / blue, white (BGRA).
        Frame {
            width: 2,
            height: 2,
            bgra: vec![
                0, 0, 255, 255, 0, 255, 0, 255, //
                255, 0, 0, 255, 255, 255, 255, 255,
            ],
        }
    }

    #[test]
    fn reads_pixels_from_bgra() {
        let f = frame();
        assert_eq!(pixel(&f, 0, 0).unwrap().hex(), "#ff0000");
        assert_eq!(pixel(&f, 1, 0).unwrap().hex(), "#00ff00");
        assert_eq!(pixel(&f, 0, 1).unwrap().hex(), "#0000ff");
        assert_eq!(pixel(&f, 2, 0), None);
    }

    #[test]
    fn loupe_grid_pads_outside_the_screen() {
        let g = around(&frame(), 0, 0, 1);
        assert_eq!(g.len(), 9);
        assert_eq!(g[0], None);
        assert_eq!(g[4].as_deref(), Some("#ff0000"));
        assert_eq!(g[8].as_deref(), Some("#ffffff"));
    }

    #[test]
    fn formats() {
        let c = Rgb {
            r: 63,
            g: 224,
            b: 197,
        };
        assert_eq!(c.hex(), "#3fe0c5");
        assert_eq!(c.css_rgb(), "rgb(63, 224, 197)");
        assert_eq!(c.css_hsl(), "hsl(170, 72%, 56%)");
        let gray = Rgb {
            r: 128,
            g: 128,
            b: 128,
        };
        assert_eq!(gray.css_hsl(), "hsl(0, 0%, 50%)");
    }

    #[test]
    fn parses_hex_with_or_without_hash() {
        let c = Rgb::from_hex(" #3FE0C5 ").unwrap();
        assert_eq!(c.hex(), "#3fe0c5");
        assert_eq!(
            Rgb::from_hex("000000").map(Rgb::hex).as_deref(),
            Some("#000000")
        );
        for bad in ["", "#fff", "#3fe0c5ff", "#zzzzzz", "#3fe0c"] {
            assert_eq!(Rgb::from_hex(bad), None, "{bad}");
        }
    }

    #[test]
    fn history_dedupes_and_caps() {
        let mut h = ColorHistory::default();
        let pick = |v: u8, at| PickedColor::new(Rgb { r: v, g: 0, b: 0 }, at);
        for v in 0..40 {
            h.add(pick(v, u64::from(v)));
        }
        assert_eq!(h.colors.len(), HISTORY_MAX);
        assert_eq!(h.colors[0].hex, "#270000");
        h.add(pick(10, 99));
        assert_eq!(h.colors[0].hex, "#0a0000");
        assert_eq!(h.colors.iter().filter(|c| c.hex == "#0a0000").count(), 1);
        h.remove("#0a0000");
        assert!(h.colors.iter().all(|c| c.hex != "#0a0000"));
    }

    #[test]
    fn pinned_colors_survive_the_cap_clear_and_a_new_pick() {
        let mut h = ColorHistory::default();
        let pick = |v: u8| PickedColor::new(Rgb { r: 0, g: v, b: 0 }, u64::from(v));
        h.add(pick(1));
        h.set_pinned("#000100", true);
        for v in 2..60 {
            h.add(pick(v));
        }
        // The oldest is still there because it is pinned; the rest stop at the cap.
        assert_eq!(h.colors.len(), HISTORY_MAX + 1);
        assert!(
            h.colors
                .last()
                .is_some_and(|c| c.hex == "#000100" && c.pinned)
        );
        // Picking it again moves it up and keeps the pin.
        h.add(pick(1));
        assert!(h.colors[0].pinned);
        h.clear();
        assert_eq!(h.colors.len(), 1);
        // Unpinned, it is an ordinary color again.
        h.set_pinned("#000100", false);
        h.clear();
        assert!(h.colors.is_empty());
    }

    #[test]
    fn old_files_without_pins_still_load() {
        let json = r##"{"colors":[{"hex":"#3fe0c5","rgb":"rgb(63, 224, 197)","hsl":"hsl(170, 72%, 56%)","at":1}]}"##;
        let h: ColorHistory = serde_json::from_str(json).unwrap();
        assert!(!h.colors[0].pinned);
    }
}
