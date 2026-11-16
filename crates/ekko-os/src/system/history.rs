//! Short rolling history for the sparklines (last ~90 s at 1.5 s per sample).

use std::collections::VecDeque;

use serde::Serialize;

use super::Snapshot;

pub const HISTORY_LEN: usize = 60;

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryPoint {
    pub at_ms: u64,
    pub cpu: f32,
    /// RAM in use, %.
    pub ram: f32,
    pub gpu: Option<f32>,
    /// System drive used, %.
    pub disk: Option<f32>,
    /// rx + tx, bytes/s.
    pub net: u64,
    pub temp: Option<f32>,
}

impl HistoryPoint {
    pub fn from_snapshot(s: &Snapshot) -> Self {
        Self {
            at_ms: s.at_ms,
            cpu: s.cpu.total,
            ram: s.memory.percent(),
            gpu: s.gpu.as_ref().map(|g| g.usage),
            disk: s.system_disk().map(|d| d.used_percent()),
            net: s.network.rx_per_sec + s.network.tx_per_sec,
            temp: s.temperature,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct History {
    points: VecDeque<HistoryPoint>,
}

impl History {
    pub fn push(&mut self, point: HistoryPoint) {
        if self.points.len() == HISTORY_LEN {
            self.points.pop_front();
        }
        self.points.push_back(point);
    }

    /// Oldest first.
    pub fn points(&self) -> Vec<HistoryPoint> {
        self.points.iter().copied().collect()
    }

    pub fn len(&self) -> usize {
        self.points.len()
    }

    pub fn is_empty(&self) -> bool {
        self.points.is_empty()
    }
}
