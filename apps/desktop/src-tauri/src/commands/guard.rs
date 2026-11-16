//! Regression guard: on Windows, building a webview window inside a *synchronous*
//! Tauri command deadlocks the app (WebView2 needs the event loop the sync command
//! is blocking). Every command that can create or show a window must be `async`.
//! This happened in the onboarding: picking a display mode froze everything.

/// Calls that may build a window (directly or through `display::apply`).
const CREATES_WINDOWS: &[&str] = &[
    "display::apply",
    "display::flows::",
    "display::summon::",
    "display::show_panel",
    "open_settings_window",
    "windows::ensure",
    "change_mode",
];

const SOURCES: &[(&str, &str)] = &[
    ("appearance.rs", include_str!("appearance.rs")),
    ("display.rs", include_str!("display.rs")),
    ("flows.rs", include_str!("flows.rs")),
    ("general.rs", include_str!("general.rs")),
    ("connectors.rs", include_str!("connectors.rs")),
    ("integrations.rs", include_str!("integrations.rs")),
    ("notch.rs", include_str!("notch.rs")),
    ("productivity.rs", include_str!("productivity.rs")),
    ("media.rs", include_str!("media.rs")),
    ("settings.rs", include_str!("settings.rs")),
    ("timers.rs", include_str!("timers.rs")),
    ("volume.rs", include_str!("volume.rs")),
];

/// Names of `#[tauri::command]` fns that touch windows but are not `async`.
fn sync_window_commands(source: &str) -> Vec<String> {
    source
        .split("#[tauri::command]")
        .skip(1)
        .filter_map(|chunk| {
            let signature = chunk.lines().find(|l| l.contains("fn "))?;
            // The command body ends at the first closing brace in column 0.
            let body = chunk.split("\n}").next().unwrap_or(chunk);
            let touches = CREATES_WINDOWS.iter().any(|m| body.contains(m));
            let name = signature.split("fn ").nth(1)?.split('(').next()?.to_owned();
            (touches && !signature.contains("async fn")).then_some(name)
        })
        .collect()
}

#[test]
fn window_commands_are_async() {
    let offenders: Vec<String> = SOURCES
        .iter()
        .flat_map(|(file, src)| {
            sync_window_commands(src)
                .into_iter()
                .map(move |n| format!("{file}: {n}"))
        })
        .collect();
    assert!(
        offenders.is_empty(),
        "comandos síncronos que criam janelas: {offenders:?}"
    );
}

#[test]
fn guard_detects_a_sync_window_command() {
    let bad = "#[tauri::command]\npub fn open(app: AppHandle) {\n    display::apply(&app, m);\n}\n";
    let good =
        "#[tauri::command]\npub async fn open(app: AppHandle) {\n    display::apply(&app, m);\n}\n";
    assert_eq!(sync_window_commands(bad), vec!["open".to_owned()]);
    assert!(sync_window_commands(good).is_empty());
}
