//! Groups processes by executable name ("chrome.exe" × 30 → one "Google Chrome" row),
//! the way people think about apps. Pure, so it is tested without a live system.

use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use super::format::{fallback_label, normalize_cpu};
use super::protect::{Protection, protected_pid, protection};

/// One raw process as read from the OS.
#[derive(Debug, Clone, PartialEq)]
pub struct ProcSample {
    pub pid: u32,
    pub parent: Option<u32>,
    pub name: String,
    pub exe: Option<String>,
    /// sysinfo's "% of one core".
    pub cpu: f32,
    pub memory: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcEntry {
    pub pid: u32,
    /// % of the whole machine.
    pub cpu: f32,
    pub memory: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessGroup {
    /// Executable name, the group key ("chrome.exe").
    pub name: String,
    /// File description or a cleaned-up name ("Google Chrome").
    pub label: String,
    pub path: Option<String>,
    pub count: usize,
    /// % of the whole machine (sum of the group).
    pub cpu: f32,
    pub memory: u64,
    pub protection: Protection,
    /// Biggest first.
    pub processes: Vec<ProcEntry>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortBy {
    #[default]
    Memory,
    Cpu,
    Name,
}

/// `describe(exe_path)` returns a friendly name when one is known (version info).
pub fn group(
    samples: &[ProcSample],
    cores: usize,
    describe: &mut dyn FnMut(&str) -> Option<String>,
) -> Vec<ProcessGroup> {
    let mut by_name: HashMap<String, ProcessGroup> = HashMap::new();
    for s in samples.iter().filter(|s| s.pid != 0 && !s.name.is_empty()) {
        let key = s.name.to_ascii_lowercase();
        let entry = ProcEntry {
            pid: s.pid,
            cpu: normalize_cpu(s.cpu, cores),
            memory: s.memory,
        };
        let g = by_name.entry(key).or_insert_with(|| ProcessGroup {
            name: s.name.clone(),
            label: String::new(),
            path: None,
            count: 0,
            cpu: 0.0,
            memory: 0,
            protection: protection(&s.name),
            processes: Vec::new(),
        });
        g.count += 1;
        g.cpu += entry.cpu;
        g.memory += entry.memory;
        if g.path.is_none() {
            g.path.clone_from(&s.exe);
        }
        // A group holding Ekko (or a kernel pid) is never offered for ending.
        if protected_pid(s.pid) {
            g.protection = Protection::Protected;
        }
        g.processes.push(entry);
    }
    by_name
        .into_values()
        .map(|mut g| {
            g.cpu = g.cpu.min(100.0);
            g.processes.sort_by_key(|p| std::cmp::Reverse(p.memory));
            g.label = g
                .path
                .as_deref()
                .and_then(&mut *describe)
                .filter(|d| !d.trim().is_empty())
                .unwrap_or_else(|| fallback_label(&g.name));
            g
        })
        .collect()
}

/// `root` and every process descending from it (Ekko's WebView2 children).
pub fn own_tree(samples: &[ProcSample], root: u32) -> HashSet<u32> {
    let mut tree = HashSet::from([root]);
    // Parent chains are short; repeat until nothing new joins.
    loop {
        let before = tree.len();
        for s in samples {
            if s.parent.is_some_and(|p| tree.contains(&p)) {
                tree.insert(s.pid);
            }
        }
        if tree.len() == before {
            return tree;
        }
    }
}

pub fn sort(groups: &mut [ProcessGroup], by: SortBy) {
    groups.sort_by(|a, b| match by {
        SortBy::Memory => b.memory.cmp(&a.memory),
        SortBy::Cpu => b.cpu.partial_cmp(&a.cpu).unwrap_or(Ordering::Equal),
        SortBy::Name => a.label.to_lowercase().cmp(&b.label.to_lowercase()),
    });
}

/// The `n` heaviest groups by `by`.
pub fn top(groups: &[ProcessGroup], by: SortBy, n: usize) -> Vec<ProcessGroup> {
    let mut sorted = groups.to_vec();
    sort(&mut sorted, by);
    sorted.truncate(n);
    sorted
}
