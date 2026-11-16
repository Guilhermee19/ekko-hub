use super::*;

const T0: u64 = 1_794_747_600_000; // 2026-11-15 10:00 BRT
const BRT: i64 = -3 * 3_600_000;
const H: u64 = 3_600_000;
const D: u64 = 24 * H;

fn task(title: &str, due_ms: Option<u64>, repeat: Option<Repeat>) -> NewTask {
    NewTask {
        title: title.into(),
        due_ms,
        repeat,
        ..NewTask::default()
    }
}

#[test]
fn add_trims_defaults_and_rejects_blank() {
    let mut ts = Tasks::default();
    assert!(ts.add(task("  ", None, None), T0).is_none());
    let id = ts.add(task(" Café ", None, None), T0).unwrap();
    let t = &ts.snapshot().tasks[0];
    assert_eq!((t.id.as_str(), t.title.as_str()), (id.as_str(), "Café"));
    assert_eq!((t.list.as_str(), t.priority), ("Pessoal", Priority::Normal));
}

#[test]
fn toggle_plain_task_flips_done() {
    let mut ts = Tasks::default();
    let id = ts.add(task("x", None, None), T0).unwrap();
    assert!(ts.toggle(&id, T0, BRT));
    assert!(ts.snapshot().tasks[0].done);
    assert!(ts.toggle(&id, T0, BRT));
    assert!(!ts.snapshot().tasks[0].done);
    assert!(!ts.toggle("nope", T0, BRT));
}

#[test]
fn completing_a_repeating_task_moves_it_to_the_next_occurrence() {
    let mut ts = Tasks::default();
    let id = ts
        .add(task("Vitamina", Some(T0 - 3 * D), Some(Repeat::Daily)), T0)
        .unwrap();
    ts.add_subtask(&id, "a", T0);
    let sub = ts.snapshot().tasks[0].subtasks[0].id.clone();
    ts.toggle_subtask(&id, &sub);
    ts.toggle(&id, T0, BRT);
    let t = &ts.snapshot().tasks[0];
    assert!(!t.done);
    assert_eq!(t.due_ms, Some(T0 + D));
    assert!(!t.subtasks[0].done);

    let weekly = ts
        .add(task("w", Some(T0 + H), Some(Repeat::Weekly)), T0)
        .unwrap();
    ts.toggle(&weekly, T0, BRT);
    assert_eq!(ts.snapshot().tasks[0].due_ms, Some(T0 + H + 7 * D));
    let monthly = ts
        .add(task("m", Some(T0), Some(Repeat::Monthly)), T0)
        .unwrap();
    ts.toggle(&monthly, T0, BRT);
    assert_eq!(ts.snapshot().tasks[0].due_ms, Some(T0 + 30 * D));
}

#[test]
fn priority_and_subtasks() {
    let mut ts = Tasks::default();
    let id = ts.add(task("x", None, None), T0).unwrap();
    assert!(ts.set_priority(&id, Priority::High));
    assert!(!ts.set_priority(&id, Priority::High));
    assert!(!ts.add_subtask(&id, " ", T0));
    assert!(ts.add_subtask(&id, "sub", T0));
    let sub = ts.snapshot().tasks[0].subtasks[0].id.clone();
    assert!(ts.toggle_subtask(&id, &sub));
    assert!(ts.snapshot().tasks[0].subtasks[0].done);
    assert!(ts.remove(&id));
    assert!(!ts.remove(&id));
}

#[test]
fn reminders_fire_once_or_reschedule() {
    let mut ts = Tasks::default();
    ts.add_reminder("later", T0 + 2 * H, None, T0);
    let once = ts.add_reminder("once", T0 + H, None, T0).unwrap();
    let daily = ts
        .add_reminder("daily", T0 + H, Some(Repeat::Daily), T0)
        .unwrap();
    assert_eq!(ts.snapshot().reminders[2].text, "later");
    assert!(ts.take_due(T0 + H - 1, BRT).is_empty());

    let fired = ts.take_due(T0 + H, BRT);
    let ids: Vec<_> = fired.iter().map(|r| r.id.as_str()).collect();
    assert_eq!(ids, [once.as_str(), daily.as_str()]);
    let snap = ts.snapshot();
    assert_eq!(snap.reminders.len(), 2);
    assert_eq!(snap.reminders[0].text, "later");
    assert_eq!(snap.reminders[1].at_ms, T0 + H + D);
    assert!(ts.remove_reminder(&daily));
}

#[test]
fn snapshot_is_camel_case_and_omits_missing_fields() {
    let mut ts = Tasks::default();
    ts.add(task("x", Some(T0), None), T0);
    ts.add_reminder("r", T0, Some(Repeat::Weekly), T0);
    let json = serde_json::to_value(ts.snapshot()).unwrap();
    assert_eq!(json["tasks"][0]["dueMs"], T0);
    assert!(json["tasks"][0].get("repeat").is_none());
    assert_eq!(json["tasks"][0]["priority"], "normal");
    assert_eq!(json["reminders"][0]["atMs"], T0);
    assert_eq!(json["reminders"][0]["repeat"], "weekly");
}
