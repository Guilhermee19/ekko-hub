//! Which pages the panel menu shows and in what order. Page ids belong to the
//! frontend (`surfaces/panel/nav.ts`); here they are opaque, just kept tidy so a
//! hand-edited file can't grow without bound.

use serde::{Deserialize, Serialize};

const MAX_IDS: usize = 48;
const MAX_ID_LEN: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PanelMenu {
    /// User order; pages not listed go after these, in the default order.
    pub order: Vec<String>,
    /// Pages the user took out of the menu.
    pub hidden: Vec<String>,
}

impl PanelMenu {
    pub fn sanitized(self) -> Self {
        Self {
            order: tidy(self.order),
            hidden: tidy(self.hidden),
        }
    }
}

/// Drops duplicates and anything that can't be a page or card id.
pub(crate) fn tidy(ids: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for id in ids {
        let id = id.trim().to_owned();
        let valid = !id.is_empty()
            && id.len() <= MAX_ID_LEN
            && id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
        if valid && !out.contains(&id) && out.len() < MAX_IDS {
            out.push(id);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_deduped_and_junk_dropped() {
        let menu = PanelMenu {
            order: vec![
                "music".into(),
                " music ".into(),
                "".into(),
                "a b".into(),
                "home".into(),
            ],
            hidden: vec!["x".repeat(40), "tasks".into()],
        }
        .sanitized();
        assert_eq!(menu.order, vec!["music", "home"]);
        assert_eq!(menu.hidden, vec!["tasks"]);
    }

    #[test]
    fn missing_menu_is_empty() {
        let menu: PanelMenu = serde_json::from_str("{}").unwrap();
        assert_eq!(menu, PanelMenu::default());
    }
}
