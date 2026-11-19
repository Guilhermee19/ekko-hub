//! Copiados: polls the clipboard change counter (cheap, no hidden window), records new
//! text with the app it came from and saves `clipboard.json` after each change.

use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::Duration;

use ekko_core::clipboard::Clipboard;
use ekko_core::store::JsonFile;
use ekko_os::clipboard::{self as os, Read};
use tauri::{AppHandle, Emitter, Manager};

use crate::services::timers::now_ms;

/// Full `Clipboard` snapshot after every change.
pub const CLIPBOARD_CHANGED: &str = "ekko://clipboard/changed";
const TICK: Duration = Duration::from_millis(400);

pub struct ClipboardService {
    data: Mutex<Clipboard>,
    file: JsonFile,
}

impl ClipboardService {
    pub fn data(&self) -> MutexGuard<'_, Clipboard> {
        self.data.lock().expect("clipboard lock")
    }
}

pub fn init(app: &AppHandle) {
    let dir = app.path().app_data_dir().unwrap_or_default();
    let file = JsonFile::new(&dir, "clipboard.json");
    let data = file.load().unwrap_or_else(|err| {
        eprintln!(
            "[ekko] {} ilegível, começando do zero: {err}",
            file.path().display()
        );
        Clipboard::default()
    });
    app.manage(ClipboardService {
        data: Mutex::new(data),
        file,
    });
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-clipboard".into())
        .spawn(move || watch(&app));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o histórico de copiados: {err}");
    }
}

/// Runs `change`; when it returns true, saves and broadcasts. Returns the snapshot.
pub fn mutate(app: &AppHandle, change: impl FnOnce(&mut Clipboard, u64) -> bool) -> Clipboard {
    let service = app.state::<ClipboardService>();
    let (changed, snapshot) = {
        let mut data = service.data();
        let changed = change(&mut data, now_ms());
        if changed && let Err(err) = service.file.save(&*data) {
            eprintln!("[ekko] falha ao salvar copiados: {err}");
        }
        (changed, data.clone())
    };
    if changed {
        let _ = app.emit(CLIPBOARD_CHANGED, &snapshot);
    }
    snapshot
}

fn watch(app: &AppHandle) {
    // Starts from the current content: what was copied before Ekko opened isn't new.
    let mut last = os::sequence();
    loop {
        thread::sleep(TICK);
        let seq = os::sequence();
        if seq == last {
            continue;
        }
        last = seq;
        if app.state::<ClipboardService>().data().paused {
            continue;
        }
        if let Read::Text(text) = os::read_text() {
            let source = os::foreground_app().unwrap_or_else(|| "Desconhecido".into());
            mutate(app, |c, now| c.record(&text, &source, now));
        }
    }
}
