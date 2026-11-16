//! Persisted productivity data (tasks, reminders, water, habits) in one JSON file.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::habits::Habits;
use crate::store::{StoreError, read_json, write_json_atomic};
use crate::tasks::Tasks;

/// Bump when the file shape changes; `load` is where migrations go.
pub const VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Productivity {
    pub version: u32,
    #[serde(default)]
    pub tasks: Tasks,
    #[serde(default)]
    pub habits: Habits,
}

impl Default for Productivity {
    fn default() -> Self {
        Self {
            version: VERSION,
            tasks: Tasks::default(),
            habits: Habits::default(),
        }
    }
}

pub struct ProductivityStore {
    path: PathBuf,
}

impl ProductivityStore {
    pub fn new(dir: &Path) -> Self {
        Self {
            path: dir.join("productivity.json"),
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Missing file → first run: no tasks/reminders, default habits, water 0/8.
    pub fn load(&self) -> Result<Productivity, StoreError> {
        let mut data: Productivity = read_json(&self.path)?;
        data.version = VERSION;
        Ok(data)
    }

    pub fn save(&self, data: &Productivity) -> Result<(), StoreError> {
        write_json_atomic(&self.path, data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tasks::NewTask;

    #[test]
    fn save_then_load_round_trips() {
        let dir = std::env::temp_dir().join(format!("ekko-prod-test-{}", std::process::id()));
        let store = ProductivityStore::new(&dir);
        let mut data = store.load().unwrap();
        assert!(data.tasks.snapshot().tasks.is_empty());
        let new = NewTask {
            title: "Pagar luz".into(),
            ..NewTask::default()
        };
        data.tasks.add(new, 1);
        data.tasks.add_reminder("Ligar", 5, None, 1);
        data.habits.set_water(3);
        store.save(&data).unwrap();

        let back = store.load().unwrap();
        assert_eq!(back.version, VERSION);
        assert_eq!(back.tasks.snapshot(), data.tasks.snapshot());
        assert_eq!(back.habits, data.habits);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
