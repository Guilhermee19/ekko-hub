//! Copiados: clipboard history and snippets. Pure model; the OS watcher lives in
//! `ekko-os::clipboard`, the file is `clipboard.json` and copied images are PNG files
//! next to it (the shell saves them; here a clip only points to its file).

use serde::{Deserialize, Serialize};

/// History sizes the user can pick (Configurações → Geral → Copiados).
pub const LIMITS: [usize; 4] = [20, 50, 100, 200];
/// Unpinned items kept by default; the oldest ones fall off.
pub const DEFAULT_LIMIT: usize = 50;
/// Bigger copies are skipped: a whole log file is not "history".
pub const MAX_CHARS: usize = 20_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClipKind {
    Text,
    Link,
    Code,
    Image,
    Files,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Clip {
    pub id: String,
    pub kind: ClipKind,
    /// The text itself; for images and files, what the list shows and search matches
    /// ("Imagem 1280×720", "relatorio.pdf, foto.png").
    pub content: String,
    /// App it was copied from ("Google Chrome").
    pub source: String,
    /// Last time it was copied, epoch ms.
    pub at: u64,
    pub pinned: bool,
    /// Images: the saved PNG.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,
    /// Files: the copied paths (the files themselves stay where they are).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub files: Vec<String>,
}

/// Something that was just copied, as the shell read it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Copied {
    Text(String),
    /// Already saved as PNG at `path` (named by content, so the same image is one file).
    Image {
        path: String,
        width: u32,
        height: u32,
    },
    Files(Vec<String>),
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

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Clipboard {
    /// While true nothing new is recorded.
    pub paused: bool,
    /// Unpinned items kept (one of `LIMITS`).
    pub limit: usize,
    /// Newest first.
    pub clips: Vec<Clip>,
    pub snippets: Vec<Snippet>,
    #[serde(skip)]
    seq: u64,
}

impl Default for Clipboard {
    fn default() -> Self {
        Self {
            paused: false,
            limit: DEFAULT_LIMIT,
            clips: Vec::new(),
            snippets: Vec::new(),
            seq: 0,
        }
    }
}

impl Clipboard {
    fn uid(&mut self, prefix: &str, now: u64) -> String {
        self.seq += 1;
        format!("{prefix}-{now:x}-{}", self.seq)
    }

    /// Records copied text (see `record_copy`).
    pub fn record(&mut self, text: &str, source: &str, now: u64) -> bool {
        self.record_copy(Copied::Text(text.to_owned()), source, now)
    }

    /// Records a copy. Copying something already in the list moves it to the top (and
    /// keeps where it first came from, so re-copying from Ekko doesn't rename it).
    pub fn record_copy(&mut self, copied: Copied, source: &str, now: u64) -> bool {
        if self.paused {
            return false;
        }
        let Some(fresh) = new_clip(copied) else {
            return false;
        };
        let clip = match self.clips.iter().position(|c| same(c, &fresh)) {
            Some(i) => {
                let mut old = self.clips.remove(i);
                old.at = now;
                old
            }
            None => Clip {
                id: self.uid("c", now),
                source: source.to_owned(),
                at: now,
                ..fresh
            },
        };
        self.clips.insert(0, clip);
        self.trim();
        true
    }

    /// Moves a clip to the top (Ekko just put it back on the clipboard).
    pub fn touch(&mut self, id: &str, now: u64) -> bool {
        let Some(i) = self.clips.iter().position(|c| c.id == id) else {
            return false;
        };
        let mut clip = self.clips.remove(i);
        clip.at = now;
        self.clips.insert(0, clip);
        true
    }

    /// Drops the oldest unpinned items beyond the limit.
    fn trim(&mut self) {
        let limit = self.limit;
        let mut unpinned = 0;
        self.clips.retain(|c| {
            if c.pinned {
                return true;
            }
            unpinned += 1;
            unpinned <= limit
        });
    }

    /// Takes the nearest allowed size and trims right away.
    pub fn set_limit(&mut self, limit: usize) -> bool {
        let limit = LIMITS
            .into_iter()
            .min_by_key(|l| l.abs_diff(limit))
            .unwrap_or(DEFAULT_LIMIT);
        let before = (self.limit, self.clips.len());
        self.limit = limit;
        self.trim();
        before != (self.limit, self.clips.len())
    }

    /// Saved images still in the history (anything else in their folder can go).
    pub fn images(&self) -> impl Iterator<Item = &str> {
        self.clips.iter().filter_map(|c| c.image.as_deref())
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

/// The clip a copy becomes (id, source and time are filled by the caller); None when
/// it is not worth keeping (blank, huge, no files).
fn new_clip(copied: Copied) -> Option<Clip> {
    let blank = |kind, content| Clip {
        id: String::new(),
        kind,
        content,
        source: String::new(),
        at: 0,
        pinned: false,
        image: None,
        files: Vec::new(),
    };
    match copied {
        Copied::Text(text) => {
            if text.trim().is_empty() || text.chars().count() > MAX_CHARS {
                return None;
            }
            Some(blank(classify(&text), text))
        }
        Copied::Image {
            path,
            width,
            height,
        } => Some(Clip {
            image: Some(path),
            ..blank(ClipKind::Image, format!("Imagem {width}×{height}"))
        }),
        Copied::Files(files) => {
            if files.is_empty() {
                return None;
            }
            let names = files
                .iter()
                .map(|f| file_name(f))
                .collect::<Vec<_>>()
                .join(", ");
            Some(Clip {
                files,
                ..blank(ClipKind::Files, names)
            })
        }
    }
}

/// Same copy as an existing clip: same text, same image file or same files.
fn same(a: &Clip, b: &Clip) -> bool {
    match b.kind {
        ClipKind::Image => a.image == b.image,
        ClipKind::Files => a.kind == ClipKind::Files && a.files == b.files,
        _ => a.image.is_none() && a.files.is_empty() && a.content == b.content,
    }
}

fn file_name(path: &str) -> &str {
    path.rsplit(['\\', '/'])
        .find(|s| !s.is_empty())
        .unwrap_or(path)
}

/// Stable 64-bit FNV-1a: names a copied image by its bytes, so copying it twice keeps
/// one file (and one entry).
pub fn content_hash(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf2_9ce4_8422_2325, |h, b| {
        (h ^ u64::from(*b)).wrapping_mul(0x0100_0000_01b3)
    })
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
