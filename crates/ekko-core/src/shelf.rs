//! Prateleira: files dropped on the notch wait here (as references, nothing is copied)
//! until they are dragged out together to another place. Pure model; reading file
//! metadata and the native drag live in the desktop shell / `ekko-os`.

use serde::{Deserialize, Serialize};

/// More than this is a folder, not a shelf.
pub const MAX_ITEMS: usize = 100;

/// What dragging out does to the files.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DropMode {
    /// Originals stay where they are (safe default).
    #[default]
    Copy,
    Move,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShelfItem {
    pub id: String,
    /// Absolute path of the original.
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    /// Bytes; 0 for folders.
    pub size: u64,
    pub added_at: u64,
}

/// A file as read from disk, before it gets an id.
#[derive(Debug, Clone, PartialEq)]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Shelf {
    pub mode: DropMode,
    /// In the order they were dropped.
    pub items: Vec<ShelfItem>,
    #[serde(skip)]
    seq: u64,
}

impl Shelf {
    /// Adds new files (same path twice is ignored, case-insensitive like Windows).
    /// Returns how many were added.
    pub fn add(&mut self, entries: Vec<FileEntry>, now: u64) -> usize {
        let mut added = 0;
        for e in entries {
            if self.items.len() >= MAX_ITEMS {
                break;
            }
            if self.items.iter().any(|i| same_path(&i.path, &e.path)) {
                continue;
            }
            self.seq += 1;
            self.items.push(ShelfItem {
                id: format!("f-{now:x}-{}", self.seq),
                path: e.path,
                name: e.name,
                is_dir: e.is_dir,
                size: e.size,
                added_at: now,
            });
            added += 1;
        }
        added
    }

    pub fn remove(&mut self, ids: &[String]) -> bool {
        let before = self.items.len();
        self.items.retain(|i| !ids.contains(&i.id));
        self.items.len() != before
    }

    pub fn clear(&mut self) -> bool {
        let had = !self.items.is_empty();
        self.items.clear();
        had
    }

    pub fn set_mode(&mut self, mode: DropMode) -> bool {
        std::mem::replace(&mut self.mode, mode) != mode
    }

    /// Forgets files that were moved or deleted elsewhere.
    pub fn retain_existing(&mut self, exists: impl Fn(&str) -> bool) -> bool {
        let before = self.items.len();
        self.items.retain(|i| exists(&i.path));
        self.items.len() != before
    }

    /// Paths of the given ids (all items when `ids` is None), in shelf order.
    pub fn paths(&self, ids: Option<&[String]>) -> Vec<String> {
        self.items
            .iter()
            .filter(|i| ids.is_none_or(|ids| ids.contains(&i.id)))
            .map(|i| i.path.clone())
            .collect()
    }

    pub fn find(&self, id: &str) -> Option<&ShelfItem> {
        self.items.iter().find(|i| i.id == id)
    }
}

/// Image types the webview can draw, so the shelf may show the file itself as preview.
pub fn previewable(name: &str) -> bool {
    const EXT: [&str; 9] = [
        "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "avif",
    ];
    name.rsplit_once('.')
        .is_some_and(|(_, ext)| EXT.iter().any(|e| ext.eq_ignore_ascii_case(e)))
}

impl ShelfItem {
    pub fn previewable(&self) -> bool {
        !self.is_dir && previewable(&self.name)
    }
}

fn same_path(a: &str, b: &str) -> bool {
    let norm = |p: &str| p.trim_end_matches(['\\', '/']).replace('/', "\\");
    norm(a).eq_ignore_ascii_case(&norm(b))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_web_images_are_previewable() {
        assert!(previewable("Foto.JPG"));
        assert!(previewable("logo.svg"));
        assert!(!previewable("raw.heic"));
        assert!(!previewable("png"));
        assert!(!previewable("notes.txt"));
    }

    fn file(path: &str) -> FileEntry {
        FileEntry {
            path: path.into(),
            name: path.rsplit('\\').next().unwrap_or(path).into(),
            is_dir: false,
            size: 10,
        }
    }

    #[test]
    fn adds_in_order_and_ignores_the_same_path() {
        let mut s = Shelf::default();
        let n = s.add(vec![file(r"C:\a.txt"), file(r"C:\b.png")], 1);
        assert_eq!(n, 2);
        assert_eq!(s.add(vec![file(r"c:/A.TXT"), file(r"C:\c.pdf")], 2), 1);
        let names: Vec<_> = s.items.iter().map(|i| i.name.as_str()).collect();
        assert_eq!(names, ["a.txt", "b.png", "c.pdf"]);
        assert_ne!(s.items[0].id, s.items[1].id);
    }

    #[test]
    fn stops_at_the_cap() {
        let mut s = Shelf::default();
        let many = (0..MAX_ITEMS + 3)
            .map(|i| file(&format!(r"C:\{i}.txt")))
            .collect();
        assert_eq!(s.add(many, 1), MAX_ITEMS);
    }

    #[test]
    fn removes_clears_and_prunes_missing() {
        let mut s = Shelf::default();
        s.add(vec![file(r"C:\a"), file(r"C:\b"), file(r"C:\c")], 1);
        let first = s.items[0].id.clone();
        assert!(s.remove(std::slice::from_ref(&first)));
        assert!(!s.remove(&[first]));
        assert!(s.retain_existing(|p| p != r"C:\b"));
        assert_eq!(s.paths(None), [r"C:\c"]);
        assert!(s.clear());
        assert!(!s.clear());
    }

    #[test]
    fn paths_follow_the_selection() {
        let mut s = Shelf::default();
        s.add(vec![file(r"C:\a"), file(r"C:\b")], 1);
        let b = s.items[1].id.clone();
        assert_eq!(s.paths(Some(&[b])), [r"C:\b"]);
        assert_eq!(s.paths(None).len(), 2);
    }

    #[test]
    fn mode_defaults_to_copy_and_is_kebab_case() {
        let mut s: Shelf = serde_json::from_str("{}").unwrap();
        assert_eq!(s.mode, DropMode::Copy);
        assert!(s.set_mode(DropMode::Move));
        assert!(!s.set_mode(DropMode::Move));
        let json = serde_json::to_value(&s).unwrap();
        assert_eq!(json["mode"], "move");
    }
}
