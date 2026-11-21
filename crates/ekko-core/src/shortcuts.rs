//! Global keyboard shortcuts ("Atalhos"). Combos are stored canonical, as the UI
//! captures them ("Ctrl+Shift+Space"); the desktop shell registers them.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShortcutAction {
    Summon,
    Palette,
    Ptt,
    Selection,
    Dictation,
    Interrupt,
    Capture,
    /// Eyedropper: pick a color anywhere on the screen.
    Color,
}

impl ShortcutAction {
    pub const ALL: [ShortcutAction; 8] = [
        ShortcutAction::Summon,
        ShortcutAction::Palette,
        ShortcutAction::Ptt,
        ShortcutAction::Selection,
        ShortcutAction::Dictation,
        ShortcutAction::Interrupt,
        ShortcutAction::Capture,
        ShortcutAction::Color,
    ];

    /// pt-BR name for logs and toasts.
    pub fn label(self) -> &'static str {
        match self {
            ShortcutAction::Summon => "Chamar o Ekko",
            ShortcutAction::Palette => "Paleta de comandos",
            ShortcutAction::Ptt => "Apertar para falar",
            ShortcutAction::Selection => "Ações no texto selecionado",
            ShortcutAction::Dictation => "Ditado",
            ShortcutAction::Interrupt => "Interromper fala",
            ShortcutAction::Capture => "Print de uma área",
            ShortcutAction::Color => "Pegar uma cor da tela",
        }
    }

    /// Roadmap phase that gives the action a real behavior; `None` = already real.
    pub fn arrives_in(self) -> Option<&'static str> {
        match self {
            ShortcutAction::Summon
            | ShortcutAction::Palette
            | ShortcutAction::Capture
            | ShortcutAction::Color => None,
            ShortcutAction::Ptt | ShortcutAction::Dictation | ShortcutAction::Interrupt => {
                Some("F3")
            }
            ShortcutAction::Selection => Some("F6"),
        }
    }

    /// Tried in order when the default combo is taken by another app.
    fn fallbacks(self) -> &'static [&'static str] {
        match self {
            ShortcutAction::Summon => &["Alt+Shift+E"],
            ShortcutAction::Palette => &["Alt+Shift+Space"],
            ShortcutAction::Capture => &["Ctrl+Alt+P"],
            ShortcutAction::Color => &["Ctrl+Alt+C"],
            _ => &[],
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ShortcutSettings {
    pub summon: String,
    pub palette: String,
    pub ptt: String,
    pub selection: String,
    pub dictation: String,
    pub interrupt: String,
    /// Alt Gr is Ctrl+Alt on Windows, so this is "Alt Gr + Print Screen".
    pub capture: String,
    /// Win+Shift+C, like PowerToys' color picker.
    pub color: String,
}

impl Default for ShortcutSettings {
    fn default() -> Self {
        Self {
            summon: "Ctrl+Shift+Space".into(),
            palette: "Ctrl+Alt+Space".into(),
            ptt: "Ctrl+Alt+V".into(),
            selection: "Ctrl+Shift+E".into(),
            dictation: "Ctrl+Shift+D".into(),
            // Never a bare Esc: a global Esc would be stolen from every app.
            interrupt: "Alt+Shift+X".into(),
            capture: "Ctrl+Alt+PrintScreen".into(),
            color: "Win+Shift+C".into(),
        }
    }
}

impl ShortcutSettings {
    pub fn get(&self, action: ShortcutAction) -> &str {
        match action {
            ShortcutAction::Summon => &self.summon,
            ShortcutAction::Palette => &self.palette,
            ShortcutAction::Ptt => &self.ptt,
            ShortcutAction::Selection => &self.selection,
            ShortcutAction::Dictation => &self.dictation,
            ShortcutAction::Interrupt => &self.interrupt,
            ShortcutAction::Capture => &self.capture,
            ShortcutAction::Color => &self.color,
        }
    }

    /// Accelerators to try for `action`, in order. The default combo keeps its
    /// fallbacks; a combo the user picked is exactly what they get.
    pub fn candidates(&self, action: ShortcutAction) -> Result<Vec<String>, InvalidCombo> {
        let combo = self.get(action);
        let mut out = vec![to_accelerator(combo)?];
        if combo.eq_ignore_ascii_case(Self::default().get(action)) {
            out.extend(
                action
                    .fallbacks()
                    .iter()
                    .filter_map(|f| to_accelerator(f).ok()),
            );
        }
        Ok(out)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("combinação inválida: {0}")]
pub struct InvalidCombo(pub String);

/// Canonical combo → accelerator understood by the global-shortcut plugin.
/// Requires one main key last and Ctrl/Alt/Win (F-keys and Print Screen may go
/// alone), so a global shortcut never swallows plain typing.
pub fn to_accelerator(combo: &str) -> Result<String, InvalidCombo> {
    let invalid = || InvalidCombo(combo.to_owned());
    let tokens: Vec<&str> = combo.split('+').map(str::trim).collect();
    let (key, mods) = tokens.split_last().ok_or_else(invalid)?;
    let mut out = Vec::new();
    let mut strong = false;
    for m in mods {
        let name = match m.to_ascii_lowercase().as_str() {
            "ctrl" | "control" => "Ctrl",
            "alt" => "Alt",
            "shift" => "Shift",
            "win" | "super" | "meta" => "Super",
            _ => return Err(invalid()),
        };
        strong |= name != "Shift";
        if out.contains(&name) {
            return Err(invalid());
        }
        out.push(name);
    }
    let key = main_key(key).ok_or_else(invalid)?;
    if !strong && !is_function_key(&key) && key != "PrintScreen" {
        return Err(invalid());
    }
    out.push(&key);
    Ok(out.join("+"))
}

fn is_function_key(key: &str) -> bool {
    key.strip_prefix('F')
        .and_then(|n| n.parse::<u8>().ok())
        .is_some_and(|n| (1..=24).contains(&n))
}

const NAMED_KEYS: &[&str] = &[
    "Space",
    "Esc",
    "Enter",
    "Tab",
    "Backspace",
    "Delete",
    "Insert",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Up",
    "Down",
    "Left",
    "Right",
    "PrintScreen",
];

/// Normalized main key, or None when the plugin would not understand it.
fn main_key(key: &str) -> Option<String> {
    if key.chars().count() == 1 {
        let c = key.chars().next()?.to_ascii_uppercase();
        return (c.is_ascii_alphanumeric() || ",.;/'[]\\-=`".contains(c)).then(|| c.to_string());
    }
    let upper = key.to_ascii_uppercase();
    if let Some(named) = NAMED_KEYS.iter().find(|k| k.to_ascii_uppercase() == upper) {
        return Some((*named).to_owned());
    }
    is_function_key(&upper).then_some(upper)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accelerators() {
        assert_eq!(
            to_accelerator("Ctrl+Shift+Space").unwrap(),
            "Ctrl+Shift+Space"
        );
        assert_eq!(to_accelerator("ctrl+alt+v").unwrap(), "Ctrl+Alt+V");
        assert_eq!(to_accelerator("Win+Shift+/").unwrap(), "Super+Shift+/");
        assert_eq!(to_accelerator("F9").unwrap(), "F9");
        assert_eq!(to_accelerator("Shift+f12").unwrap(), "Shift+F12");
        // Print Screen alone is fine: it never types anything.
        assert_eq!(to_accelerator("PrintScreen").unwrap(), "PrintScreen");
        assert_eq!(
            to_accelerator("Shift+printscreen").unwrap(),
            "Shift+PrintScreen"
        );
    }

    #[test]
    fn rejects_unsafe_or_malformed_combos() {
        for bad in [
            "Esc",
            "A",
            "Shift+A",
            "Ctrl+",
            "Ctrl+Ctrl+A",
            "Ctrl+Hyper+A",
            "Ctrl+Ç",
            "",
        ] {
            assert!(to_accelerator(bad).is_err(), "{bad} deveria ser inválido");
        }
    }

    #[test]
    fn defaults_are_valid_and_keep_fallbacks() {
        let s = ShortcutSettings::default();
        for action in ShortcutAction::ALL {
            assert!(s.candidates(action).is_ok(), "{action:?}");
        }
        assert_eq!(
            s.candidates(ShortcutAction::Palette).unwrap(),
            vec!["Ctrl+Alt+Space", "Alt+Shift+Space"]
        );
    }

    #[test]
    fn custom_combo_has_no_fallback() {
        let s = ShortcutSettings {
            summon: "Ctrl+Alt+K".into(),
            ..ShortcutSettings::default()
        };
        assert_eq!(
            s.candidates(ShortcutAction::Summon).unwrap(),
            vec!["Ctrl+Alt+K"]
        );
    }

    #[test]
    fn summon_palette_and_capture_are_real_today() {
        let real: Vec<_> = ShortcutAction::ALL
            .into_iter()
            .filter(|a| a.arrives_in().is_none())
            .collect();
        assert_eq!(
            real,
            vec![
                ShortcutAction::Summon,
                ShortcutAction::Palette,
                ShortcutAction::Capture,
                ShortcutAction::Color
            ]
        );
        assert_eq!(to_accelerator("Win+Shift+C").unwrap(), "Super+Shift+C");
        assert_eq!(
            to_accelerator("Ctrl+Alt+PrintScreen").unwrap(),
            "Ctrl+Alt+PrintScreen"
        );
    }

    #[test]
    fn serde_shape() {
        let json = serde_json::to_value(ShortcutSettings::default()).unwrap();
        assert_eq!(json["summon"], "Ctrl+Shift+Space");
        assert_eq!(serde_json::to_value(ShortcutAction::Ptt).unwrap(), "ptt");
    }
}
