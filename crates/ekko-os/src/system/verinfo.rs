//! Friendly app names from the exe's version resource ("chrome.exe" → "Google Chrome").
//! Read once per executable (the monitor caches it).

/// `FileDescription` of the file, if it has one.
pub fn description(path: &str) -> Option<String> {
    #[cfg(windows)]
    {
        win::description(path)
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        None
    }
}

#[cfg(windows)]
mod win {
    use std::ffi::c_void;

    use windows::Win32::Storage::FileSystem::{
        GetFileVersionInfoSizeW, GetFileVersionInfoW, VerQueryValueW,
    };
    use windows::core::HSTRING;

    pub fn description(path: &str) -> Option<String> {
        let file = HSTRING::from(path);
        // SAFETY: the version block lives in `data` for the whole function; every pointer
        // VerQueryValueW returns points inside it and is read within `len`.
        unsafe {
            let size = GetFileVersionInfoSizeW(&file, None);
            if size == 0 {
                return None;
            }
            let mut data = vec![0u8; size as usize];
            GetFileVersionInfoW(&file, None, size, data.as_mut_ptr().cast()).ok()?;
            let block = data.as_ptr().cast::<c_void>();

            let mut ptr: *mut c_void = std::ptr::null_mut();
            let mut len = 0u32;
            let translation = HSTRING::from("\\VarFileInfo\\Translation");
            let (lang, cp) =
                if VerQueryValueW(block, &translation, &mut ptr, &mut len).as_bool() && len >= 4 {
                    let pair = ptr.cast::<u16>();
                    (*pair, *pair.add(1))
                } else {
                    (0x0409, 0x04b0)
                };
            let key = HSTRING::from(format!(
                "\\StringFileInfo\\{lang:04x}{cp:04x}\\FileDescription"
            ));
            if !VerQueryValueW(block, &key, &mut ptr, &mut len).as_bool() || len == 0 {
                return None;
            }
            let chars = std::slice::from_raw_parts(ptr.cast::<u16>(), len as usize);
            let end = chars.iter().position(|&c| c == 0).unwrap_or(chars.len());
            let text = String::from_utf16_lossy(&chars[..end]).trim().to_owned();
            (!text.is_empty()).then_some(text)
        }
    }
}
