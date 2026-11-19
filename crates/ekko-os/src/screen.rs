//! Screen pixels for prints: a GDI copy of a rectangle of the virtual screen
//! (physical pixels, every monitor), as 32-bit BGRA rows top to bottom.

#[derive(Debug, Clone)]
pub struct Pixels {
    pub width: u32,
    pub height: u32,
    pub bgra: Vec<u8>,
}

#[derive(Debug, thiserror::Error)]
pub enum ScreenError {
    #[error("área de tela inválida")]
    Empty,
    #[error("o Windows recusou a captura da tela: {0}")]
    Os(String),
    #[error("captura de tela só funciona no Windows")]
    Unsupported,
}

/// Copies `w`×`h` pixels at (`x`, `y`) of the virtual screen.
pub fn grab(x: i32, y: i32, w: i32, h: i32) -> Result<Pixels, ScreenError> {
    if w <= 0 || h <= 0 {
        return Err(ScreenError::Empty);
    }
    #[cfg(windows)]
    {
        win::grab(x, y, w, h)
    }
    #[cfg(not(windows))]
    {
        let _ = (x, y);
        Err(ScreenError::Unsupported)
    }
}

#[cfg(windows)]
mod win {
    use windows::Win32::Graphics::Gdi::{
        BI_RGB, BITMAPINFO, BITMAPINFOHEADER, BitBlt, CAPTUREBLT, CreateCompatibleBitmap,
        CreateCompatibleDC, DIB_RGB_COLORS, DeleteDC, DeleteObject, GetDC, GetDIBits, HDC,
        ReleaseDC, SRCCOPY, SelectObject,
    };

    use super::{Pixels, ScreenError};

    /// The screen DC; released on drop.
    struct Screen(HDC);
    impl Drop for Screen {
        fn drop(&mut self) {
            // SAFETY: obtained from GetDC(None) and released once.
            unsafe { ReleaseDC(None, self.0) };
        }
    }

    pub fn grab(x: i32, y: i32, w: i32, h: i32) -> Result<Pixels, ScreenError> {
        // SAFETY: plain GDI; every object created here is selected out and deleted
        // before returning, and GetDIBits writes inside the buffer sized for w×h×4.
        unsafe {
            let screen = Screen(GetDC(None));
            if screen.0.is_invalid() {
                return Err(ScreenError::Os("sem acesso à tela".into()));
            }
            let mem = CreateCompatibleDC(Some(screen.0));
            let bitmap = CreateCompatibleBitmap(screen.0, w, h);
            let old = SelectObject(mem, bitmap.into());
            // CAPTUREBLT includes layered windows (menus, tooltips, Ekko's own notch).
            let copied = BitBlt(mem, 0, 0, w, h, Some(screen.0), x, y, SRCCOPY | CAPTUREBLT);
            SelectObject(mem, old);
            let mut info = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: w,
                    // Negative: rows top to bottom.
                    biHeight: -h,
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    ..Default::default()
                },
                ..Default::default()
            };
            let mut bgra = vec![0u8; w as usize * h as usize * 4];
            let lines = if copied.is_ok() {
                GetDIBits(
                    mem,
                    bitmap,
                    0,
                    h as u32,
                    Some(bgra.as_mut_ptr().cast()),
                    &mut info,
                    DIB_RGB_COLORS,
                )
            } else {
                0
            };
            let _ = DeleteObject(bitmap.into());
            let _ = DeleteDC(mem);
            copied.map_err(|e| ScreenError::Os(e.message()))?;
            if lines != h {
                return Err(ScreenError::Os("cópia da tela incompleta".into()));
            }
            // GDI leaves alpha at 0; screen pixels are opaque.
            for px in bgra.as_chunks_mut::<4>().0 {
                px[3] = 255;
            }
            Ok(Pixels {
                width: w as u32,
                height: h as u32,
                bgra,
            })
        }
    }
}
