//! Tauri shell: wires IPC, windows and tray to the `ekko-*` crates. No business logic here.

mod commands;
mod display;
mod services;
mod state;
mod tray;

use ekko_core::store::SettingsStore;
use tauri::{Manager, RunEvent, Window, WindowEvent};

use display::windows::{HUB, ONBOARDING, ORB, PALETTE, PANEL, SETTINGS};
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            app.manage(AppState::new(SettingsStore::new(&dir)));

            let handle = app.handle().clone();
            tray::build(&handle)?;
            display::hit::spawn(handle.clone());
            services::timers::spawn(handle.clone());
            services::productivity::init(&handle);
            services::media::spawn(&handle);
            services::volume::spawn(&handle);
            services::integrations::init(&handle);
            services::shortcuts::init(&handle);
            services::fullscreen::spawn(&handle);
            commands::general::sync_autostart(&handle);

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
            commands::general::set_autostart,
            commands::general::set_general,
            commands::general::set_shortcuts,
            commands::general::shortcut_status,
            commands::appearance::set_appearance,
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
            commands::timers::list_timers,
            commands::timers::timer_add,
            commands::timers::timer_pause,
            commands::timers::timer_resume,
            commands::timers::timer_cancel,
            commands::timers::timer_extend,
            commands::timers::pomodoro,
            commands::productivity::list_tasks,
            commands::productivity::task_add,
            commands::productivity::task_toggle,
            commands::productivity::task_remove,
            commands::productivity::task_set_priority,
            commands::productivity::subtask_add,
            commands::productivity::subtask_toggle,
            commands::productivity::reminder_add,
            commands::productivity::reminder_remove,
            commands::productivity::list_habits,
            commands::productivity::water_add,
            commands::productivity::water_set,
            commands::productivity::habit_check_in,
            commands::productivity::habit_undo,
            commands::media::media_now,
            commands::media::media_play_pause,
            commands::media::media_next,
            commands::media::media_previous,
            commands::media::media_seek,
            commands::volume::volume_get,
            commands::volume::volume_set,
            commands::volume::volume_step,
            commands::volume::volume_mute,
            commands::integrations::integration_status,
            commands::integrations::set_integration_client,
            commands::integrations::connect_spotify,
            commands::integrations::connect_google,
            commands::integrations::disconnect_integration,
            commands::integrations::calendar_upcoming,
            commands::integrations::spotify_state,
            commands::integrations::spotify_devices,
            commands::integrations::spotify_queue,
            commands::integrations::spotify_transfer,
            commands::integrations::spotify_control,
            commands::integrations::spotify_shuffle,
            commands::integrations::spotify_repeat,
            commands::integrations::spotify_seek,
            commands::integrations::spotify_volume,
            commands::integrations::open_external,
            commands::connectors::ha_status,
            commands::connectors::ha_set,
            commands::connectors::ha_disconnect,
            commands::connectors::ha_entities,
            commands::connectors::ha_toggle,
            commands::connectors::claude_code_status,
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
