//! Tauri shell: wires IPC, windows and tray to the `ekko-*` crates. No business logic here.

mod commands;
mod display;
mod state;
mod tray;

use ekko_core::store::SettingsStore;
use tauri::{Manager, RunEvent, Window, WindowEvent};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

use display::windows::{HUB, ONBOARDING, ORB, PALETTE, PANEL, SETTINGS};
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            app.manage(AppState::new(SettingsStore::new(&dir)));

            let handle = app.handle().clone();
            tray::build(&handle)?;
            display::hit::spawn(handle.clone());
            register_hotkeys(&handle);

            let settings = app.state::<AppState>().settings();
            display::apply(&handle, settings.display_mode)?;
            if !settings.onboarded {
                display::flows::show_onboarding(&handle)?;
            }
            Ok(())
        })
        .on_window_event(on_window_event)
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::set_persona,
            commands::settings::set_dock_side,
            commands::settings::set_names,
            commands::settings::open_settings,
            commands::display::set_display_mode,
            commands::display::set_hit_rect,
            commands::display::summon,
            commands::display::show_panel_beside_orb,
            commands::notch::set_notch,
            commands::notch::list_monitors,
            commands::notch::set_monitor,
            commands::notch::notch_drag_start,
            commands::notch::notch_drag_move,
            commands::notch::notch_drag_end,
            commands::notch::get_notch_anchor,
            commands::flows::toggle_palette,
            commands::flows::open_onboarding,
            commands::flows::finish_onboarding,
            commands::flows::show_alarm,
            commands::flows::take_alarm,
        ])
        .build(tauri::generate_context!())
        .expect("falha ao iniciar o Ekko")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                app.state::<AppState>().persist();
            }
        });
}

fn on_window_event(window: &Window, event: &WindowEvent) {
    match (window.label(), event) {
        // Popover behavior: the shared panel closes when it loses focus.
        (PALETTE, WindowEvent::Focused(focused)) => {
            if display::flows::palette_focus_changed(*focused) {
                let _ = window.hide();
            }
        }
        (PANEL, WindowEvent::Focused(false)) => {
            let _ = window.hide();
        }
        // Remember where the orb was dragged; saved to disk on exit/next change.
        (ORB, WindowEvent::Moved(pos)) => {
            window
                .state::<AppState>()
                .update_unsaved(|s| s.orb_position = Some((pos.x, pos.y)));
        }
        // Closing a full window just hides it; Ekko lives on in the tray.
        (HUB | SETTINGS | ONBOARDING, WindowEvent::CloseRequested { api, .. }) => {
            api.prevent_close();
            let _ = window.hide();
        }
        _ => {}
    }
}

/// Global hotkeys (configurable later in Atalhos). Another app may own a combo, so each
/// action tries its fallbacks in order and a missing hotkey never stops Ekko.
fn register_hotkeys(app: &tauri::AppHandle) {
    let ctrl_shift = Modifiers::CONTROL | Modifiers::SHIFT;
    let ctrl_alt = Modifiers::CONTROL | Modifiers::ALT;
    let alt_shift = Modifiers::ALT | Modifiers::SHIFT;
    register_first(
        app,
        "chamar o Ekko",
        &[
            Shortcut::new(Some(ctrl_shift), Code::Space),
            Shortcut::new(Some(alt_shift), Code::KeyE),
        ],
        |app| {
            let _ = display::summon::summon(app, None);
        },
    );
    register_first(
        app,
        "paleta de comandos",
        &[
            Shortcut::new(Some(ctrl_alt), Code::Space),
            Shortcut::new(Some(alt_shift), Code::Space),
        ],
        |app| {
            let _ = display::flows::toggle_palette(app);
        },
    );
}

fn register_first(
    app: &tauri::AppHandle,
    what: &str,
    candidates: &[Shortcut],
    action: fn(&tauri::AppHandle),
) {
    let shortcuts = app.global_shortcut();
    for shortcut in candidates {
        let result = shortcuts.on_shortcut(*shortcut, move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                action(app);
            }
        });
        match result {
            Ok(()) => return,
            Err(err) => eprintln!("[ekko] atalho de {what} ocupado ({shortcut:?}): {err}"),
        }
    }
    eprintln!("[ekko] nenhum atalho livre para {what}; use o menu da bandeja");
}
