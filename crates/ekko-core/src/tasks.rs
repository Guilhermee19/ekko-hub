//! Tasks (with subtasks, priority, list, due, repeat) and reminders. Pure: the clock
//! (`now`, epoch ms) and the local UTC offset are always passed in.

use serde::{Deserialize, Serialize};

use crate::clock::{DAY_MS, add_months};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Priority {
    Low,
    #[default]
    Normal,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Repeat {
    Daily,
    Weekly,
    Monthly,
}

impl Repeat {
    /// One period after `at_ms`, same local time.
    pub fn step(self, at_ms: u64, offset_ms: i64) -> u64 {
        match self {
            Self::Daily => at_ms + DAY_MS as u64,
            Self::Weekly => at_ms + 7 * DAY_MS as u64,
            Self::Monthly => add_months(at_ms, 1, offset_ms),
        }
    }

    /// First occurrence after `now`, stepping from `at_ms` (skips missed ones).
    pub fn next_after(self, at_ms: u64, now: u64, offset_ms: i64) -> u64 {
        let mut next = self.step(at_ms, offset_ms);
        while next <= now {
            next = self.step(next, offset_ms);
        }
        next
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subtask {
    pub id: String,
    pub title: String,
    pub done: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub done: bool,
    pub priority: Priority,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub due_ms: Option<u64>,
    pub list: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repeat: Option<Repeat>,
    #[serde(default)]
    pub subtasks: Vec<Subtask>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reminder {
    pub id: String,
    pub at_ms: u64,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repeat: Option<Repeat>,
}

impl Reminder {
    pub fn due(&self, now: u64) -> bool {
        self.at_ms <= now
    }
}

/// Input for `Tasks::add` (IPC payload).
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTask {
    pub title: String,
    pub list: Option<String>,
    pub priority: Option<Priority>,
    pub due_ms: Option<u64>,
    pub repeat: Option<Repeat>,
}

/// What every window renders: sent on each change. Reminders are sorted by time.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksSnapshot {
    pub tasks: Vec<Task>,
    pub reminders: Vec<Reminder>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tasks {
    #[serde(default)]
    tasks: Vec<Task>,
    #[serde(default)]
    reminders: Vec<Reminder>,
    #[serde(skip)]
    seq: u64,
}

impl Tasks {
    pub fn snapshot(&self) -> TasksSnapshot {
        TasksSnapshot {
            tasks: self.tasks.clone(),
            reminders: self.reminders.clone(),
        }
    }

    fn uid(&mut self, prefix: &str, now: u64) -> String {
        self.seq += 1;
        format!("{prefix}-{now:x}-{}", self.seq)
    }

    fn find(&mut self, id: &str) -> Option<&mut Task> {
        self.tasks.iter_mut().find(|t| t.id == id)
    }

    /// Newest first. `None` when the title is blank.
    pub fn add(&mut self, new: NewTask, now: u64) -> Option<String> {
        let title = new.title.trim();
        if title.is_empty() {
            return None;
        }
        let id = self.uid("t", now);
        let list = new
            .list
            .map(|l| l.trim().to_owned())
            .filter(|l| !l.is_empty());
        self.tasks.insert(
            0,
            Task {
                id: id.clone(),
                title: title.to_owned(),
                done: false,
                priority: new.priority.unwrap_or_default(),
                due_ms: new.due_ms,
                list: list.unwrap_or_else(|| "Pessoal".to_owned()),
                repeat: new.repeat,
                subtasks: Vec::new(),
            },
        );
        Some(id)
    }

    /// Completing a repeating task moves it to its next occurrence (subtasks reset)
    /// instead of marking it done.
    pub fn toggle(&mut self, id: &str, now: u64, offset_ms: i64) -> bool {
        let Some(t) = self.find(id) else { return false };
        match (t.done, t.repeat) {
            (false, Some(repeat)) => {
                t.due_ms = Some(repeat.next_after(t.due_ms.unwrap_or(now), now, offset_ms));
                t.subtasks.iter_mut().for_each(|s| s.done = false);
            }
            _ => t.done = !t.done,
        }
        true
    }

    pub fn remove(&mut self, id: &str) -> bool {
        let before = self.tasks.len();
        self.tasks.retain(|t| t.id != id);
        self.tasks.len() != before
    }

    pub fn set_priority(&mut self, id: &str, priority: Priority) -> bool {
        match self.find(id) {
            Some(t) if t.priority != priority => {
                t.priority = priority;
                true
            }
            _ => false,
        }
    }

    pub fn add_subtask(&mut self, task_id: &str, title: &str, now: u64) -> bool {
        let title = title.trim();
        if title.is_empty() || self.find(task_id).is_none() {
            return false;
        }
        let id = self.uid("s", now);
        if let Some(t) = self.find(task_id) {
            t.subtasks.push(Subtask {
                id,
                title: title.to_owned(),
                done: false,
            });
        }
        true
    }

    pub fn toggle_subtask(&mut self, task_id: &str, sub_id: &str) -> bool {
        let Some(t) = self.find(task_id) else {
            return false;
        };
        match t.subtasks.iter_mut().find(|s| s.id == sub_id) {
            Some(s) => {
                s.done = !s.done;
                true
            }
            None => false,
        }
    }

    pub fn add_reminder(
        &mut self,
        text: &str,
        at_ms: u64,
        repeat: Option<Repeat>,
        now: u64,
    ) -> Option<String> {
        let text = text.trim();
        if text.is_empty() {
            return None;
        }
        let id = self.uid("r", now);
        self.reminders.push(Reminder {
            id: id.clone(),
            at_ms,
            text: text.to_owned(),
            repeat,
        });
        self.reminders.sort_by_key(|r| r.at_ms);
        Some(id)
    }

    pub fn remove_reminder(&mut self, id: &str) -> bool {
        let before = self.reminders.len();
        self.reminders.retain(|r| r.id != id);
        self.reminders.len() != before
    }

    /// Returns the reminders that are due. One-off ones are removed; repeating ones
    /// move to their next occurrence after `now`.
    pub fn take_due(&mut self, now: u64, offset_ms: i64) -> Vec<Reminder> {
        let fired: Vec<Reminder> = self
            .reminders
            .iter()
            .filter(|r| r.due(now))
            .cloned()
            .collect();
        if fired.is_empty() {
            return fired;
        }
        self.reminders.retain_mut(|r| match (r.due(now), r.repeat) {
            (false, _) => true,
            (true, Some(repeat)) => {
                r.at_ms = repeat.next_after(r.at_ms, now, offset_ms);
                true
            }
            (true, None) => false,
        });
        self.reminders.sort_by_key(|r| r.at_ms);
        fired
    }
}

#[cfg(test)]
#[path = "tasks_tests.rs"]
mod tests;
