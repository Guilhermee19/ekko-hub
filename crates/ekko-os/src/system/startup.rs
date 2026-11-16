//! Programs that start with Windows: the `Run` registry keys and the Startup folders,
//! with the on/off state Task Manager keeps in `StartupApproved`. READ-ONLY: changing
//! them is left to Windows' own screen (`open_settings`).

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    /// "Registro (usuário)", "Pasta Inicializar (todos)"…
    pub location: String,
    pub enabled: bool,
}

/// `StartupApproved` binary value: first byte even (02/06) = on, odd (03/07) = off.
/// No value at all means Windows never toggled it, i.e. on.
pub fn approved_enabled(data: Option<&[u8]>) -> bool {
    data.and_then(|d| d.first()).is_none_or(|b| b & 1 == 0)
}

/// All entries, enabled first.
pub fn list() -> Vec<StartupItem> {
    #[cfg(windows)]
    let mut items = win::list();
    #[cfg(not(windows))]
    let mut items: Vec<StartupItem> = Vec::new();
    items.sort_by(|a, b| {
        b.enabled
            .cmp(&a.enabled)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    items
}

/// Opens Windows' "Aplicativos de inicialização" page (no elevation needed).
pub fn open_settings() -> std::io::Result<()> {
    std::process::Command::new("explorer.exe")
        .arg("ms-settings:startupapps")
        .spawn()
        .map(|_| ())
}

#[cfg(windows)]
mod win {
    use std::path::PathBuf;

    use windows::Win32::Foundation::ERROR_SUCCESS;
    use windows::Win32::System::Registry::{
        HKEY, HKEY_CURRENT_USER, HKEY_LOCAL_MACHINE, KEY_READ, REG_EXPAND_SZ, REG_SZ, RegCloseKey,
        RegEnumValueW, RegOpenKeyExW,
    };
    use windows::core::HSTRING;

    use super::{StartupItem, approved_enabled};

    const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const RUN32: &str = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";
    const APPROVED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved";

    struct Value {
        name: String,
        kind: u32,
        data: Vec<u8>,
    }

    impl Value {
        fn text(&self) -> String {
            let wide: Vec<u16> = self
                .data
                .as_chunks::<2>()
                .0
                .iter()
                .map(|c| u16::from_le_bytes(*c))
                .take_while(|&c| c != 0)
                .collect();
            String::from_utf16_lossy(&wide)
        }
    }

    /// Every value of `root\path` (empty when the key does not exist).
    fn values(root: HKEY, path: &str) -> Vec<Value> {
        let mut out = Vec::new();
        let mut key = HKEY::default();
        // SAFETY: buffers are sized locals; the key is closed before returning.
        unsafe {
            if RegOpenKeyExW(root, &HSTRING::from(path), Some(0), KEY_READ, &mut key)
                != ERROR_SUCCESS
            {
                return out;
            }
            let mut name = vec![0u16; 16_384];
            let mut data = vec![0u8; 64 * 1024];
            for index in 0.. {
                let mut name_len = name.len() as u32;
                let mut data_len = data.len() as u32;
                let mut kind = 0u32;
                let status = RegEnumValueW(
                    key,
                    index,
                    Some(windows::core::PWSTR(name.as_mut_ptr())),
                    &mut name_len,
                    None,
                    Some(&mut kind),
                    Some(data.as_mut_ptr()),
                    Some(&mut data_len),
                );
                if status != ERROR_SUCCESS {
                    break;
                }
                out.push(Value {
                    name: String::from_utf16_lossy(&name[..name_len as usize]),
                    kind,
                    data: data[..data_len as usize].to_vec(),
                });
            }
            let _ = RegCloseKey(key);
        }
        out
    }

    fn approved(root: HKEY, sub: &str, name: &str) -> bool {
        let values = values(root, &format!(r"{APPROVED}\{sub}"));
        approved_enabled(
            values
                .iter()
                .find(|v| v.name.eq_ignore_ascii_case(name))
                .map(|v| v.data.as_slice()),
        )
    }

    fn registry(root: HKEY, path: &str, approved_sub: &str, location: &str) -> Vec<StartupItem> {
        values(root, path)
            .into_iter()
            .filter(|v| v.kind == REG_SZ.0 || v.kind == REG_EXPAND_SZ.0)
            .map(|v| StartupItem {
                enabled: approved(root, approved_sub, &v.name),
                command: v.text(),
                name: v.name,
                location: location.to_owned(),
            })
            .collect()
    }

    fn folder(dir: Option<PathBuf>, root: HKEY, location: &str) -> Vec<StartupItem> {
        let Some(entries) = dir.and_then(|d| std::fs::read_dir(d).ok()) else {
            return Vec::new();
        };
        entries
            .flatten()
            .filter(|e| e.file_type().is_ok_and(|t| t.is_file()))
            .map(|e| e.file_name().to_string_lossy().into_owned())
            .filter(|f| !f.eq_ignore_ascii_case("desktop.ini"))
            .map(|file| StartupItem {
                enabled: approved(root, "StartupFolder", &file),
                name: file
                    .rsplit_once('.')
                    .map_or(file.as_str(), |(stem, _)| stem)
                    .to_owned(),
                command: file,
                location: location.to_owned(),
            })
            .collect()
    }

    fn startup_dir(var: &str) -> Option<PathBuf> {
        let base = std::env::var_os(var)?;
        Some(PathBuf::from(base).join(r"Microsoft\Windows\Start Menu\Programs\Startup"))
    }

    pub fn list() -> Vec<StartupItem> {
        let mut items = registry(HKEY_CURRENT_USER, RUN, "Run", "Registro (usuário)");
        items.extend(registry(HKEY_LOCAL_MACHINE, RUN, "Run", "Registro (todos)"));
        items.extend(registry(
            HKEY_LOCAL_MACHINE,
            RUN32,
            "Run32",
            "Registro (todos, 32 bits)",
        ));
        items.extend(folder(
            startup_dir("APPDATA"),
            HKEY_CURRENT_USER,
            "Pasta Inicializar",
        ));
        items.extend(folder(
            startup_dir("ProgramData"),
            HKEY_LOCAL_MACHINE,
            "Pasta Inicializar (todos)",
        ));
        items
    }
}
