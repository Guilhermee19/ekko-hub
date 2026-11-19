//! Native drag of files out of an Ekko window (the shelf's "arraste para outro lugar").
//! Uses the shell's own data object and `SHDoDragDrop`, so Explorer, the desktop, mail
//! and chat apps accept it and Windows draws the thumbnail stack with the count.
//! Must run on the window's UI thread (OLE initialized), and blocks until the drop.

use std::path::PathBuf;

/// What the drop target did, as far as OLE reports it. An "optimized move" by Explorer
/// may report `None`, so callers check which files still exist afterwards.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DragEffect {
    None,
    Copy,
    Move,
}

#[derive(Debug, thiserror::Error)]
pub enum DragError {
    #[error("arquivo não encontrado: {0}")]
    NotFound(String),
    #[error("o Windows recusou o arraste: {0}")]
    Os(String),
    #[error("arrastar arquivos só funciona no Windows")]
    Unsupported,
}

/// `hwnd` is the raw handle of the source window; `allow_move` offers only "move".
pub fn drag_files(
    hwnd: isize,
    paths: &[PathBuf],
    allow_move: bool,
) -> Result<DragEffect, DragError> {
    #[cfg(windows)]
    {
        win::drag_files(hwnd, paths, allow_move)
    }
    #[cfg(not(windows))]
    {
        let _ = (hwnd, paths, allow_move);
        Err(DragError::Unsupported)
    }
}

#[cfg(windows)]
mod win {
    use std::os::windows::ffi::OsStrExt;
    use std::path::PathBuf;

    use windows::Win32::Foundation::HWND;
    use windows::Win32::System::Com::IDataObject;
    use windows::Win32::System::Ole::{
        DROPEFFECT_COPY, DROPEFFECT_MOVE, IDropSource, OleInitialize,
    };
    use windows::Win32::UI::Shell::Common::ITEMIDLIST;
    use windows::Win32::UI::Shell::{
        BHID_DataObject, ILCreateFromPathW, ILFree, IShellItemArray,
        SHCreateShellItemArrayFromIDLists, SHDoDragDrop,
    };
    use windows::core::PCWSTR;

    use super::{DragEffect, DragError};

    fn os(err: windows::core::Error) -> DragError {
        DragError::Os(err.message())
    }

    /// Item ID lists for the paths; freed on drop.
    struct Pidls(Vec<*mut ITEMIDLIST>);

    impl Drop for Pidls {
        fn drop(&mut self) {
            for p in &self.0 {
                // SAFETY: each pointer came from ILCreateFromPathW and is freed once.
                unsafe { ILFree(Some(p.cast_const())) };
            }
        }
    }

    pub fn drag_files(
        hwnd: isize,
        paths: &[PathBuf],
        allow_move: bool,
    ) -> Result<DragEffect, DragError> {
        // SAFETY: COM/OLE calls on the UI thread; every pointer is checked or owned above.
        unsafe {
            // Already initialized on the UI thread by the window system; this only adds a ref.
            let _ = OleInitialize(None);
            let mut pidls = Pidls(Vec::with_capacity(paths.len()));
            for path in paths {
                let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
                let pidl = ILCreateFromPathW(PCWSTR(wide.as_ptr()));
                if pidl.is_null() {
                    return Err(DragError::NotFound(path.display().to_string()));
                }
                pidls.0.push(pidl);
            }
            let list: Vec<*const ITEMIDLIST> = pidls.0.iter().map(|p| p.cast_const()).collect();
            let items: IShellItemArray = SHCreateShellItemArrayFromIDLists(&list).map_err(os)?;
            let data: IDataObject = items.BindToHandler(None, &BHID_DataObject).map_err(os)?;
            let allowed = if allow_move {
                DROPEFFECT_MOVE
            } else {
                DROPEFFECT_COPY
            };
            let window = HWND(hwnd as *mut core::ffi::c_void);
            let effect =
                SHDoDragDrop(Some(window), &data, None::<&IDropSource>, allowed).map_err(os)?;
            Ok(if effect.contains(DROPEFFECT_MOVE) {
                DragEffect::Move
            } else if effect.contains(DROPEFFECT_COPY) {
                DragEffect::Copy
            } else {
                DragEffect::None
            })
        }
    }
}
