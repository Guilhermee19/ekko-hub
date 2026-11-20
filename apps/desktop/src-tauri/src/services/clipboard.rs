//! Copiados: polls the clipboard change counter (cheap, no hidden window), records new
//! text, images and files with the app they came from and saves `clipboard.json` after
//! each change. Images become PNGs in `clipboard/` next to it; the ones that leave the
//! history are deleted, so the folder never grows past the chosen limit.

use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

use ekko_core::capture::Frame;
use ekko_core::clipboard::{Clip, ClipKind, Clipboard, Copied, content_hash};
use ekko_core::store::JsonFile;
use ekko_os::clipboard::{self as os, Image, Read};
use tauri::{AppHandle, Emitter, Manager};

use crate::services::timers::now_ms;

/// Full `Clipboard` snapshot after every change.
pub const CLIPBOARD_CHANGED: &str = "ekko://clipboard/changed";
const TICK: Duration = Duration::from_millis(400);
/// A change this soon after Ekko wrote a clip is that write, not a new copy.
const ECHO: Duration = Duration::from_millis(1500);

pub struct ClipboardService {
    data: Mutex<Clipboard>,
    file: JsonFile,
    images: PathBuf,
    /// Clip Ekko just put back on the clipboard, and when.
    echo: Mutex<Option<(String, Instant)>>,
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
    let images = dir.join("clipboard");
    // Only this folder becomes readable by the webview, for the previews.
    if let Err(err) = app.asset_protocol_scope().allow_directory(&images, false) {
        eprintln!("[ekko] prévia das imagens copiadas indisponível: {err}");
    }
    app.manage(ClipboardService {
        data: Mutex::new(data),
        file,
        images,
        echo: Mutex::new(None),
    });
    let app = app.clone();
    let spawned = thread::Builder::new()
        .name("ekko-clipboard".into())
        .spawn(move || watch(&app));
    if let Err(err) = spawned {
        eprintln!("[ekko] falha ao iniciar o histórico de copiados: {err}");
    }
}

/// Runs `change`; when it returns true, saves, drops images that left the history and
/// broadcasts. Returns the snapshot.
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
        prune_images(&service.images, &snapshot);
        let _ = app.emit(CLIPBOARD_CHANGED, &snapshot);
    }
    snapshot
}

/// Puts a history item back on the clipboard: text, the image or the files.
pub fn copy_back(app: &AppHandle, id: &str) -> Result<(), String> {
    let service = app.state::<ClipboardService>();
    let clip = service
        .data()
        .clips
        .iter()
        .find(|c| c.id == id)
        .cloned()
        .ok_or("esse item não está mais no histórico")?;
    write(&clip)?;
    *service.echo.lock().expect("echo lock") = Some((clip.id, Instant::now()));
    Ok(())
}

fn write(clip: &Clip) -> Result<(), String> {
    match clip.kind {
        ClipKind::Image => {
            let path = clip.image.as_deref().ok_or("imagem sem arquivo")?;
            let png = std::fs::read(path).map_err(|_| "a imagem não existe mais")?;
            let frame = Frame::from_png(&png).map_err(|e| e.to_string())?;
            os::write_image(&frame.dib()).map_err(|e| e.to_string())
        }
        ClipKind::Files => {
            let alive: Vec<String> = clip
                .files
                .iter()
                .filter(|f| Path::new(f).exists())
                .cloned()
                .collect();
            if alive.is_empty() {
                return Err("esses arquivos não existem mais".into());
            }
            os::write_files(&alive).map_err(|e| e.to_string())
        }
        _ => os::write_text(&clip.content).map_err(|e| e.to_string()),
    }
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
        let service = app.state::<ClipboardService>();
        if service.data().paused {
            continue;
        }
        let echo = service.echo.lock().expect("echo lock").take();
        if let Some((id, _)) = echo.filter(|(_, at)| at.elapsed() < ECHO) {
            mutate(app, |c, now| c.touch(&id, now));
            continue;
        }
        let copied = match os::read() {
            Read::Text(text) => Copied::Text(text),
            Read::Files(files) => Copied::Files(files),
            Read::Image(image) => match save_image(&service.images, image) {
                Ok(copied) => copied,
                Err(err) => {
                    eprintln!("[ekko] imagem copiada ignorada: {err}");
                    continue;
                }
            },
            Read::Nothing | Read::Private => continue,
        };
        let source = os::foreground_app().unwrap_or_else(|| "Desconhecido".into());
        mutate(app, |c, now| c.record_copy(copied, &source, now));
    }
}

/// Saves a copied image as PNG named by its content (copying it again reuses the file).
fn save_image(dir: &Path, image: Image) -> Result<Copied, String> {
    let (png, width, height) = match image {
        Image::Png(bytes) => {
            let frame = Frame::from_png(&bytes).map_err(|e| e.to_string())?;
            (bytes, frame.width, frame.height)
        }
        Image::Dib(bytes) => {
            let frame = Frame::from_dib(&bytes).map_err(|e| e.to_string())?;
            let png = frame.png().map_err(|e| e.to_string())?;
            (png, frame.width, frame.height)
        }
    };
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("img-{:016x}.png", content_hash(&png)));
    if !path.exists() {
        std::fs::write(&path, &png).map_err(|e| e.to_string())?;
    }
    Ok(Copied::Image {
        path: path.to_string_lossy().into_owned(),
        width,
        height,
    })
}

/// Deletes the saved images no clip points to any more (trimmed, removed, cleared).
fn prune_images(dir: &Path, clipboard: &Clipboard) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    let keep: Vec<&Path> = clipboard.images().map(Path::new).collect();
    for entry in entries.flatten() {
        let path = entry.path();
        let ours = path.extension().is_some_and(|e| e == "png");
        if ours && !keep.contains(&path.as_path()) {
            let _ = std::fs::remove_file(&path);
        }
    }
}
