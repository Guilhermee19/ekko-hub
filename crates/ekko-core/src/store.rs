//! Settings persistence as a JSON file. Secrets never go here (see ARCHITECTURE.md).

use std::fs;
use std::path::{Path, PathBuf};

use crate::Settings;

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("falha de E/S em {path}: {source}")]
    Io {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("settings inválidos: {0}")]
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
        match fs::read_to_string(&self.path) {
            Ok(text) => Ok(serde_json::from_str(&text)?),
            Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(Settings::default()),
            Err(source) => Err(self.io_error(source)),
        }
    }

    /// Writes to a temp file then renames, so a crash never leaves half a file.
    pub fn save(&self, settings: &Settings) -> Result<(), StoreError> {
        if let Some(dir) = self.path.parent() {
            fs::create_dir_all(dir).map_err(|source| self.io_error(source))?;
        }
        let tmp = self.path.with_extension("json.tmp");
        fs::write(&tmp, serde_json::to_string_pretty(settings)?)
            .map_err(|source| self.io_error(source))?;
        fs::rename(&tmp, &self.path).map_err(|source| self.io_error(source))
    }

    fn io_error(&self, source: std::io::Error) -> StoreError {
        StoreError::Io {
            path: self.path.clone(),
            source,
        }
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
