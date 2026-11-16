//! Settings persistence as a JSON file. Secrets never go here (see ARCHITECTURE.md).

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::Settings;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("falha de E/S em {path}: {source}")]
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("JSON inválido: {0}")]
    Json(#[from] serde_json::Error),
}

pub struct SettingsStore {
    path: PathBuf,
}

impl SettingsStore {
    pub fn new(dir: &Path) -> Self {
        Self {
            path: dir.join("settings.json"),
        }
    }

    /// Missing file means first run, so it returns defaults instead of an error.
    pub fn load(&self) -> Result<Settings, StoreError> {
        read_json(&self.path)
    }

    pub fn save(&self, settings: &Settings) -> Result<(), StoreError> {
        write_json_atomic(&self.path, settings)
    }
}

/// Reads a JSON file; a missing file means first run, so it returns `T::default()`.
pub fn read_json<T: DeserializeOwned + Default>(path: &Path) -> Result<T, StoreError> {
    match fs::read_to_string(path) {
        Ok(text) => Ok(serde_json::from_str(&text)?),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(T::default()),
        Err(source) => Err(io_error(path, source)),
    }
}

/// Writes to a temp file then renames, so a crash never leaves half a file.
pub fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> Result<(), StoreError> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|source| io_error(path, source))?;
    }
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, serde_json::to_string_pretty(value)?).map_err(|s| io_error(path, s))?;
    fs::rename(&tmp, path).map_err(|source| io_error(path, source))
}

fn io_error(path: &Path, source: std::io::Error) -> StoreError {
    StoreError::Io {
        path: path.to_path_buf(),
        source,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::DisplayMode;

    #[test]
    fn save_then_load_round_trips() {
        let dir = std::env::temp_dir().join(format!("ekko-store-test-{}", std::process::id()));
        let store = SettingsStore::new(&dir);
        let settings = Settings {
            display_mode: DisplayMode::Dock,
            ..Settings::default()
        };
        store.save(&settings).unwrap();
        assert_eq!(store.load().unwrap(), settings);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn missing_file_returns_defaults() {
        let store = SettingsStore::new(Path::new("Z:/definitely/not/here"));
        assert_eq!(store.load().unwrap(), Settings::default());
    }
}
