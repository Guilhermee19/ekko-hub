//! Prateleira: files dropped on the notch, saved as references in `shelf.json`, and
//! the native drag that takes them out again (on the UI thread, as OLE requires).

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};

use ekko_core::shelf::{DropMode, FileEntry, Shelf};
use ekko_core::store::JsonFile;
use ekko_os::filedrag;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::services::timers::now_ms;

/// Full `Shelf` snapshot after every change.
pub const SHELF_CHANGED: &str = "ekko://shelf/changed";
/// A drag out finished (dropped or cancelled); payload: the effect name.
pub const SHELF_DRAG_END: &str = "ekko://shelf/drag-end";

pub struct ShelfService {
    data: Mutex<Shelf>,
    file: JsonFile,
    /// True while our own drag is running: the notch is also a drop target and would
    /// otherwise "receive" the files it is sending.
    dragging: AtomicBool,
}

impl ShelfService {
    pub fn data(&self) -> MutexGuard<'_, Shelf> {
        self.data.lock().expect("shelf lock")
    }

    pub fn dragging(&self) -> bool {
        self.dragging.load(Ordering::Relaxed)
    }
}

pub fn init(app: &AppHandle) {
    let dir = app.path().app_data_dir().unwrap_or_default();
    let file = JsonFile::new(&dir, "shelf.json");
    let mut data: Shelf = file.load().unwrap_or_else(|err| {
        eprintln!(
            "[ekko] {} ilegível, começando do zero: {err}",
            file.path().display()
        );
        Shelf::default()
    });
    data.retain_existing(exists);
    allow_previews(app, &data);
    app.manage(ShelfService {
        data: Mutex::new(data),
        file,
        dragging: AtomicBool::new(false),
    });
}

/// Runs `change`; when it returns true, saves and broadcasts. Returns the snapshot.
pub fn mutate(app: &AppHandle, change: impl FnOnce(&mut Shelf, u64) -> bool) -> Shelf {
    let service = app.state::<ShelfService>();
    let (changed, snapshot) = {
        let mut data = service.data();
        let changed = change(&mut data, now_ms());
        if changed && let Err(err) = service.file.save(&*data) {
            eprintln!("[ekko] falha ao salvar a prateleira: {err}");
        }
        (changed, data.clone())
    };
    if changed {
        allow_previews(app, &snapshot);
        let _ = app.emit(SHELF_CHANGED, &snapshot);
    }
    snapshot
}

/// Lets the webview read just the shelved images (asset protocol, empty scope by
/// default), so the shelf can show them as previews. Nothing else becomes readable.
fn allow_previews(app: &AppHandle, shelf: &Shelf) {
    let scope = app.asset_protocol_scope();
    for item in shelf.items.iter().filter(|i| i.previewable()) {
        if let Err(err) = scope.allow_file(&item.path) {
            eprintln!("[ekko] prévia de {} indisponível: {err}", item.name);
        }
    }
}

pub fn exists(path: &str) -> bool {
    Path::new(path).exists()
}

/// Metadata for a dropped path; None when it vanished in the meantime.
pub fn entry(path: &str) -> Option<FileEntry> {
    let meta = std::fs::metadata(path).ok()?;
    let name = Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_owned());
    Some(FileEntry {
        path: path.to_owned(),
        name,
        is_dir: meta.is_dir(),
        size: if meta.is_dir() { 0 } else { meta.len() },
    })
}

/// Starts the native drag of `paths` from `window`. Returns at once; the drag runs on
/// the UI thread and `SHELF_DRAG_END` fires when it ends.
pub fn drag_out(app: &AppHandle, window: &WebviewWindow, paths: Vec<String>) -> Result<(), String> {
    let service = app.state::<ShelfService>();
    if paths.is_empty() || service.dragging.swap(true, Ordering::Relaxed) {
        return Ok(());
    }
    let mode = service.data().mode;
    let hwnd = match window.hwnd() {
        Ok(h) => h.0 as isize,
        Err(err) => {
            service.dragging.store(false, Ordering::Relaxed);
            return Err(err.to_string());
        }
    };
    let handle = app.clone();
    let scheduled = app.run_on_main_thread(move || {
        let files: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
        let result = filedrag::drag_files(hwnd, &files, mode == DropMode::Move);
        handle
            .state::<ShelfService>()
            .dragging
            .store(false, Ordering::Relaxed);
        // Moved (or deleted) files leave the shelf; copies stay for the next drop.
        mutate(&handle, |s, _| s.retain_existing(exists));
        let effect = match &result {
            Ok(e) => format!("{e:?}").to_lowercase(),
            Err(err) => {
                eprintln!("[ekko] arrastar arquivos: {err}");
                "error".into()
            }
        };
        let _ = handle.emit(SHELF_DRAG_END, effect);
    });
    if let Err(err) = scheduled {
        service.dragging.store(false, Ordering::Relaxed);
        return Err(err.to_string());
    }
    Ok(())
}
