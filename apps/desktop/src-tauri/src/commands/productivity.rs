//! Tasks/reminders/water/habits IPC. Each command returns the new snapshot (also
//! broadcast). None of them opens a window, so they can stay sync.

use ekko_core::habits::HabitsSnapshot;
use ekko_core::tasks::{NewTask, Priority, Repeat, TasksSnapshot};
use tauri::{AppHandle, Manager};

use crate::services::productivity::{ProductivityService, mutate_habits, mutate_tasks};

#[tauri::command]
pub fn list_tasks(app: AppHandle) -> TasksSnapshot {
    app.state::<ProductivityService>().data().tasks.snapshot()
}

#[tauri::command]
pub fn task_add(app: AppHandle, task: NewTask) -> TasksSnapshot {
    mutate_tasks(&app, |t, now, _| t.add(task, now).is_some())
}

/// Completing a repeating task moves it to its next occurrence.
#[tauri::command]
pub fn task_toggle(app: AppHandle, id: String) -> TasksSnapshot {
    mutate_tasks(&app, |t, now, offset| t.toggle(&id, now, offset))
}

#[tauri::command]
pub fn task_remove(app: AppHandle, id: String) -> TasksSnapshot {
    mutate_tasks(&app, |t, _, _| t.remove(&id))
}

#[tauri::command]
pub fn task_set_priority(app: AppHandle, id: String, priority: Priority) -> TasksSnapshot {
    mutate_tasks(&app, |t, _, _| t.set_priority(&id, priority))
}

#[tauri::command]
pub fn subtask_add(app: AppHandle, task_id: String, title: String) -> TasksSnapshot {
    mutate_tasks(&app, |t, now, _| t.add_subtask(&task_id, &title, now))
}

#[tauri::command]
pub fn subtask_toggle(app: AppHandle, task_id: String, sub_id: String) -> TasksSnapshot {
    mutate_tasks(&app, |t, _, _| t.toggle_subtask(&task_id, &sub_id))
}

#[tauri::command]
pub fn reminder_add(
    app: AppHandle,
    text: String,
    at_ms: u64,
    repeat: Option<Repeat>,
) -> TasksSnapshot {
    mutate_tasks(&app, |t, now, _| {
        t.add_reminder(&text, at_ms, repeat, now).is_some()
    })
}

#[tauri::command]
pub fn reminder_remove(app: AppHandle, id: String) -> TasksSnapshot {
    mutate_tasks(&app, |t, _, _| t.remove_reminder(&id))
}

#[tauri::command]
pub fn list_habits(app: AppHandle) -> HabitsSnapshot {
    mutate_habits(&app, |_| false)
}

#[tauri::command]
pub fn water_add(app: AppHandle, delta: i32) -> HabitsSnapshot {
    mutate_habits(&app, |h| h.add_water(delta))
}

#[tauri::command]
pub fn water_set(app: AppHandle, count: u32) -> HabitsSnapshot {
    mutate_habits(&app, |h| h.set_water(count))
}

#[tauri::command]
pub fn habit_check_in(app: AppHandle, id: String) -> HabitsSnapshot {
    mutate_habits(&app, |h| h.check_in(&id))
}

#[tauri::command]
pub fn habit_undo(app: AppHandle, id: String) -> HabitsSnapshot {
    mutate_habits(&app, |h| h.undo(&id))
}
