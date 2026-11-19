//! Copiados: clipboard history and snippets. Pure model; the OS watcher lives in
//! `ekko-os::clipboard` and the file is `clipboard.json`.

use serde::{Deserialize, Serialize};

/// Unpinned items kept; the oldest ones fall off.
pub const MAX_CLIPS: usize = 200;
/// Bigger copies are skipped: a whole log file is not "history".
pub const MAX_CHARS: usize = 20_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClipKind {
    Text,
    Link,
    Code,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: String,
    pub kind: ClipKind,
    pub content: String,
    /// App it was copied from ("Google Chrome").
    pub source: String,
    /// Last time it was copied, epoch ms.
    pub at: u64,
    pub pinned: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snippet {
    pub id: String,
    pub name: String,
    /// Text expansion trigger, e.g. ";email".
    pub shortcut: String,
    pub content: String,
}

/// Snippet from the form: no id means a new one.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SnippetInput {
    pub id: Option<String>,
    pub name: String,
    pub shortcut: String,
    pub content: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Clipboard {
    /// While true nothing new is recorded.
    pub paused: bool,
    /// Newest first.
    pub clips: Vec<Clip>,
    pub snippets: Vec<Snippet>,
    #[serde(skip)]
    seq: u64,
}

impl Clipboard {
    fn uid(&mut self, prefix: &str, now: u64) -> String {
        self.seq += 1;
        format!("{prefix}-{now:x}-{}", self.seq)
    }

    /// Records a copy. Copying something already in the list moves it to the top (and
    /// keeps where it first came from, so re-copying from Ekko doesn't rename it).
    pub fn record(&mut self, text: &str, source: &str, now: u64) -> bool {
        if self.paused || text.trim().is_empty() || text.chars().count() > MAX_CHARS {
            return false;
        }
        let clip = match self.clips.iter().position(|c| c.content == text) {
            Some(i) => {
                let mut old = self.clips.remove(i);
                old.at = now;
                old
            }
            None => Clip {
                id: self.uid("c", now),
                kind: classify(text),
                content: text.to_owned(),
                source: source.to_owned(),
                at: now,
                pinned: false,
            },
        };
        self.clips.insert(0, clip);
        self.trim();
        true
    }

    /// Drops the oldest unpinned items beyond `MAX_CLIPS`.
    fn trim(&mut self) {
        let mut unpinned = 0;
        self.clips.retain(|c| {
            if c.pinned {
                return true;
            }
            unpinned += 1;
            unpinned <= MAX_CLIPS
        });
    }

    pub fn toggle_pin(&mut self, id: &str) -> bool {
        match self.clips.iter_mut().find(|c| c.id == id) {
            Some(c) => {
                c.pinned = !c.pinned;
                true
            }
            None => false,
        }
    }

    pub fn remove(&mut self, id: &str) -> bool {
        let before = self.clips.len();
        self.clips.retain(|c| c.id != id);
        self.clips.len() != before
    }

    /// Removes every unpinned item.
    pub fn clear_unpinned(&mut self) -> bool {
        let before = self.clips.len();
        self.clips.retain(|c| c.pinned);
        self.clips.len() != before
    }

    pub fn set_paused(&mut self, paused: bool) -> bool {
        std::mem::replace(&mut self.paused, paused) != paused
    }

    /// Creates or updates; blank name or content is refused.
    pub fn save_snippet(&mut self, input: SnippetInput, now: u64) -> bool {
        let name = input.name.trim();
        if name.is_empty() || input.content.trim().is_empty() {
            return false;
        }
        let shortcut = input.shortcut.trim().to_owned();
        if let Some(s) = input
            .id
            .as_deref()
            .and_then(|id| self.snippets.iter_mut().find(|s| s.id == id))
        {
            s.name = name.to_owned();
            s.shortcut = shortcut;
            s.content = input.content;
            return true;
        }
        let id = self.uid("s", now);
        self.snippets.push(Snippet {
            id,
            name: name.to_owned(),
            shortcut,
            content: input.content,
        });
        true
    }

    pub fn remove_snippet(&mut self, id: &str) -> bool {
        let before = self.snippets.len();
        self.snippets.retain(|s| s.id != id);
        self.snippets.len() != before
    }
}

/// Code-looking markers; two of them (or one in a multi-line copy) mean code.
const CODE_MARKS: [&str; 16] = [
    "=>",
    "();",
    "{",
    "};",
    "&&",
    "::",
    "fn ",
    "const ",
    "let ",
    "def ",
    "import ",
    "function ",
    "</",
    "npm ",
    "cargo ",
    "git ",
];

/// Link if it is a single URL, code if it looks like code, text otherwise.
pub fn classify(text: &str) -> ClipKind {
    let t = text.trim();
    let url = ["http://", "https://", "www."]
        .iter()
        .any(|p| t.starts_with(p));
    if url && !t.contains(char::is_whitespace) {
        return ClipKind::Link;
    }
    let hits = CODE_MARKS.iter().filter(|m| t.contains(*m)).count();
    if hits >= 2 || (hits == 1 && t.lines().count() > 1) {
        ClipKind::Code
    } else {
        ClipKind::Text
    }
}

#[cfg(test)]
#[path = "clipboard_tests.rs"]
mod tests;
