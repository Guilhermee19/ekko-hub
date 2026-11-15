use std::collections::HashMap;
use std::sync::Mutex;

use ekko_core::Settings;
use ekko_core::store::SettingsStore;
use serde::Deserialize;

use crate::display::notch::Drag;

/// Area of an overlay window that should receive the mouse, logical px relative to it.
#[derive(Debug, Clone, Copy, Default, Deserialize)]
pub struct HitRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    /// Increasing per window: IPC calls may arrive out of order, and a stale (bigger)
    /// rect would make the notch open with the cursor outside it.
    #[serde(default)]
    pub seq: u64,
}

pub struct AppState {
    settings: Mutex<Settings>,
    store: SettingsStore,
    hit_rects: Mutex<HashMap<String, HitRect>>,
    drag: Mutex<Option<Drag>>,
    /// Pill center inside the notch window, logical px (see `display::notch`).
    notch_anchor: Mutex<f64>,
    pending_alarm: Mutex<Option<serde_json::Value>>,
}

impl AppState {
    pub fn new(store: SettingsStore) -> Self {
        let settings = store.load().unwrap_or_else(|err| {
            eprintln!("[ekko] settings ilegíveis, usando padrão: {err}");
            Settings::default()
        });
        Self {
            settings: Mutex::new(settings),
            store,
            hit_rects: Mutex::new(HashMap::new()),
            drag: Mutex::new(None),
            notch_anchor: Mutex::new(0.0),
            pending_alarm: Mutex::new(None),
        }
    }

    pub fn settings(&self) -> Settings {
        self.settings.lock().expect("settings lock").clone()
    }

    /// Applies a change, persists it and returns the new snapshot.
    pub fn update(&self, change: impl FnOnce(&mut Settings)) -> Settings {
        let snapshot = self.update_unsaved(change);
        self.persist();
        snapshot
    }

    /// For high-frequency changes (window drag); call `persist` later.
    pub fn update_unsaved(&self, change: impl FnOnce(&mut Settings)) -> Settings {
        let mut guard = self.settings.lock().expect("settings lock");
        change(&mut guard);
        guard.clone()
    }

    pub fn persist(&self) {
        if let Err(err) = self.store.save(&self.settings()) {
            eprintln!("[ekko] falha ao salvar settings: {err}");
        }
    }

    pub fn hit_rect(&self, label: &str) -> Option<HitRect> {
        self.hit_rects.lock().expect("hit lock").get(label).copied()
    }

    pub fn set_hit_rect(&self, label: &str, rect: HitRect) {
        let mut rects = self.hit_rects.lock().expect("hit lock");
        // seq 0 = caller without a counter; always accept it.
        let stale = rects
            .get(label)
            .is_some_and(|old| rect.seq != 0 && rect.seq < old.seq);
        if !stale {
            rects.insert(label.to_owned(), rect);
        }
    }

    pub fn drag(&self) -> Option<Drag> {
        *self.drag.lock().expect("drag lock")
    }

    pub fn set_drag(&self, drag: Option<Drag>) {
        *self.drag.lock().expect("drag lock") = drag;
    }

    pub fn notch_anchor(&self) -> f64 {
        *self.notch_anchor.lock().expect("anchor lock")
    }

    pub fn set_notch_anchor(&self, anchor: f64) {
        *self.notch_anchor.lock().expect("anchor lock") = anchor;
    }

    pub fn set_pending_alarm(&self, alarm: Option<serde_json::Value>) {
        *self.pending_alarm.lock().expect("alarm lock") = alarm;
    }

    pub fn take_pending_alarm(&self) -> Option<serde_json::Value> {
        self.pending_alarm.lock().expect("alarm lock").take()
    }
}
