//! Windows clipboard for Copiados: a cheap change counter to poll (no hidden window),
//! read/write text, images and files, and the friendly name of the app that copied.
//! Copies flagged private by password managers are reported as `Read::Private`, the
//! same rule Windows' own clipboard history follows.

/// Longest text read, in UTF-16 units; bigger copies are not history material.
const READ_LIMIT: usize = 200_000;
/// Biggest image read, in bytes (40 megapixels at 32 bits).
const IMAGE_LIMIT: usize = 160_000_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Read {
    Text(String),
    Image(Image),
    /// Paths copied in Explorer (or any app that copies files).
    Files(Vec<String>),
    /// Nothing Copiados keeps, too big, or the clipboard was busy.
    Nothing,
    /// The app asked not to be recorded (passwords).
    Private,
}

/// A copied image as the app put it: PNG keeps transparency, DIB is what most apps use.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Image {
    Png(Vec<u8>),
    Dib(Vec<u8>),
}

#[derive(Debug, thiserror::Error)]
#[error("a área de transferência está ocupada por outro programa")]
pub struct Busy;

/// Changes every time anything is copied; compare to know when to read.
pub fn sequence() -> u32 {
    #[cfg(windows)]
    {
        win::sequence()
    }
    #[cfg(not(windows))]
    {
        0
    }
}

/// What is on the clipboard: files first (Explorer also puts their names as text),
/// then text (Office puts a picture of the cells too), then an image.
pub fn read() -> Read {
    #[cfg(windows)]
    {
        win::read()
    }
    #[cfg(not(windows))]
    {
        Read::Nothing
    }
}

pub fn write_text(text: &str) -> Result<(), Busy> {
    #[cfg(windows)]
    {
        win::write_text(text)
    }
    #[cfg(not(windows))]
    {
        let _ = text;
        Err(Busy)
    }
}

/// Puts files on the clipboard, as Explorer's "Copiar" does (paste them anywhere).
pub fn write_files(paths: &[String]) -> Result<(), Busy> {
    #[cfg(windows)]
    {
        // 15 = CF_HDROP.
        win::write_bytes(15, &crate::drop_files::encode(paths))
    }
    #[cfg(not(windows))]
    {
        let _ = paths;
        Err(Busy)
    }
}

/// Puts an image on the clipboard as CF_DIB (`dib`: BITMAPINFOHEADER + pixels).
pub fn write_image(dib: &[u8]) -> Result<(), Busy> {
    #[cfg(windows)]
    {
        win::write_bytes(8, dib)
    }
    #[cfg(not(windows))]
    {
        let _ = dib;
        Err(Busy)
    }
}

/// Friendly name of the foreground app ("Google Chrome"), used as the copy source.
pub fn foreground_app() -> Option<String> {
    #[cfg(windows)]
    {
        let path = win::foreground_exe()?;
        let file = path.rsplit(['\\', '/']).next().unwrap_or(&path).to_owned();
        Some(
            crate::system::verinfo::description(&path)
                .unwrap_or_else(|| crate::system::format::fallback_label(&file)),
        )
    }
    #[cfg(not(windows))]
    {
        None
    }
}

#[cfg(windows)]
mod win {
    use std::thread;
    use std::time::Duration;

    use windows::Win32::Foundation::{CloseHandle, GlobalFree, HANDLE, HGLOBAL};
    use windows::Win32::System::DataExchange::{
        CloseClipboard, EmptyClipboard, GetClipboardData, GetClipboardSequenceNumber,
        IsClipboardFormatAvailable, OpenClipboard, RegisterClipboardFormatW, SetClipboardData,
    };
    use windows::Win32::System::Memory::{
        GMEM_MOVEABLE, GlobalAlloc, GlobalLock, GlobalSize, GlobalUnlock,
    };
    use windows::Win32::System::Ole::CF_UNICODETEXT;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
        QueryFullProcessImageNameW,
    };
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};
    use windows::core::{PWSTR, w};

    use super::{Busy, IMAGE_LIMIT, Image, READ_LIMIT, Read};

    /// The clipboard while open; closed on drop. Another app may hold it for a moment.
    struct Open;

    impl Open {
        fn new() -> Option<Self> {
            for _ in 0..6 {
                // SAFETY: no owner window; closed by Drop.
                if unsafe { OpenClipboard(None) }.is_ok() {
                    return Some(Open);
                }
                thread::sleep(Duration::from_millis(15));
            }
            None
        }
    }

    impl Drop for Open {
        fn drop(&mut self) {
            // SAFETY: only built after a successful OpenClipboard.
            let _ = unsafe { CloseClipboard() };
        }
    }

    pub fn sequence() -> u32 {
        // SAFETY: plain query.
        unsafe { GetClipboardSequenceNumber() }
    }

    fn available(format: u32) -> bool {
        // SAFETY: plain query on the open clipboard.
        unsafe { IsClipboardFormatAvailable(format) }.is_ok()
    }

    /// Password managers mark copies with these formats (see "Clipboard formats" docs).
    fn private() -> bool {
        // SAFETY: registering a format name is idempotent; reads stay inside GlobalSize.
        unsafe {
            let exclude =
                RegisterClipboardFormatW(w!("ExcludeClipboardContentFromMonitorProcessing"));
            let ignore = RegisterClipboardFormatW(w!("Clipboard Viewer Ignore"));
            if available(exclude) || available(ignore) {
                return true;
            }
            let history = RegisterClipboardFormatW(w!("CanIncludeInClipboardHistory"));
            let Ok(handle) = GetClipboardData(history) else {
                return false;
            };
            let global = HGLOBAL(handle.0);
            let ptr = GlobalLock(global) as *const u32;
            if ptr.is_null() || GlobalSize(global) < 4 {
                return false;
            }
            let allowed = *ptr;
            let _ = GlobalUnlock(global);
            allowed == 0
        }
    }

    pub fn read() -> Read {
        let Some(_open) = Open::new() else {
            return Read::Nothing;
        };
        if private() {
            return Read::Private;
        }
        // 15 = CF_HDROP, 8 = CF_DIB (Windows also makes it from CF_BITMAP/CF_DIBV5).
        let files = bytes(15, IMAGE_LIMIT)
            .map(|b| crate::drop_files::decode(&b))
            .unwrap_or_default();
        if !files.is_empty() {
            return Read::Files(files);
        }
        if let Some(text) = text() {
            return Read::Text(text);
        }
        // SAFETY: registering a format name is idempotent.
        let png = unsafe { RegisterClipboardFormatW(w!("PNG")) };
        if let Some(b) = bytes(png, IMAGE_LIMIT) {
            return Read::Image(Image::Png(b));
        }
        bytes(8, IMAGE_LIMIT).map_or(Read::Nothing, |b| Read::Image(Image::Dib(b)))
    }

    /// A copy of `format`'s data (None when missing or bigger than `limit`).
    fn bytes(format: u32, limit: usize) -> Option<Vec<u8>> {
        // SAFETY: the handle belongs to the open clipboard; reads stay inside GlobalSize.
        unsafe {
            let handle = GetClipboardData(format).ok()?;
            let global = HGLOBAL(handle.0);
            let size = GlobalSize(global);
            if size == 0 || size > limit {
                return None;
            }
            let ptr = GlobalLock(global) as *const u8;
            if ptr.is_null() {
                return None;
            }
            let out = std::slice::from_raw_parts(ptr, size).to_vec();
            let _ = GlobalUnlock(global);
            Some(out)
        }
    }

    fn text() -> Option<String> {
        // SAFETY: the handle belongs to the open clipboard; reads stay inside GlobalSize.
        unsafe {
            let handle = GetClipboardData(u32::from(CF_UNICODETEXT.0)).ok()?;
            let global = HGLOBAL(handle.0);
            let ptr = GlobalLock(global) as *const u16;
            if ptr.is_null() {
                return None;
            }
            let units = (GlobalSize(global) / 2).min(READ_LIMIT);
            let slice = std::slice::from_raw_parts(ptr, units);
            let text = slice
                .iter()
                .position(|&u| u == 0)
                .map(|len| String::from_utf16_lossy(&slice[..len]));
            let _ = GlobalUnlock(global);
            text
        }
    }

    pub fn write_text(text: &str) -> Result<(), Busy> {
        let bytes: Vec<u8> = text
            .encode_utf16()
            .chain(std::iter::once(0))
            .flat_map(u16::to_le_bytes)
            .collect();
        write_bytes(u32::from(CF_UNICODETEXT.0), &bytes)
    }

    /// Replaces the clipboard with `bytes` in `format`.
    pub fn write_bytes(format: u32, bytes: &[u8]) -> Result<(), Busy> {
        let _open = Open::new().ok_or(Busy)?;
        // SAFETY: the buffer is sized for `bytes`; on success the system owns the memory.
        unsafe {
            EmptyClipboard().map_err(|_| Busy)?;
            let global = GlobalAlloc(GMEM_MOVEABLE, bytes.len()).map_err(|_| Busy)?;
            let ptr = GlobalLock(global) as *mut u8;
            if ptr.is_null() {
                let _ = GlobalFree(Some(global));
                return Err(Busy);
            }
            std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
            let _ = GlobalUnlock(global);
            if SetClipboardData(format, Some(HANDLE(global.0))).is_err() {
                let _ = GlobalFree(Some(global));
                return Err(Busy);
            }
        }
        Ok(())
    }

    pub fn foreground_exe() -> Option<String> {
        // SAFETY: plain queries; the process handle is closed before returning.
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_invalid() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == 0 {
                return None;
            }
            if pid == std::process::id() {
                return Some("Ekko.exe".into());
            }
            let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 1024];
            let mut len = buf.len() as u32;
            let named = QueryFullProcessImageNameW(
                process,
                PROCESS_NAME_WIN32,
                PWSTR(buf.as_mut_ptr()),
                &mut len,
            );
            let _ = CloseHandle(process);
            named.ok()?;
            Some(String::from_utf16_lossy(&buf[..len as usize]))
        }
    }
}
