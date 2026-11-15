//! System tray icon: present in every mode (it is the way back if a surface is hidden).

use ekko_core::DisplayMode;
use tauri::menu::{CheckMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

use crate::{commands, display, state::AppState};

const TRAY_ID: &str = "ekko-tray";
const OPEN: &str = "open";
const SETTINGS: &str = "settings";
const PALETTE: &str = "palette";
const QUIT: &str = "quit";
const MODE_PREFIX: &str = "mode:";

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or(tauri::Error::UnknownPath)?;
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .tooltip("Ekko")
        .menu(&menu(app)?)
        .show_menu_on_left_click(false)
        .on_menu_event(on_menu)
        .on_tray_icon_event(on_click)
        .build(app)?;
    Ok(())
}

/// Rebuilds the menu so the mode checkmarks follow the settings.
pub fn refresh(app: &AppHandle) -> tauri::Result<()> {
    match app.tray_by_id(TRAY_ID) {
        Some(tray) => tray.set_menu(Some(menu(app)?)),
        None => Ok(()),
    }
}

fn menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let current = app.state::<AppState>().settings().display_mode;
    let modes = DisplayMode::ALL
        .into_iter()
        .map(|m| {
            let id = format!("{MODE_PREFIX}{}", m.id());
            CheckMenuItem::with_id(app, id, m.label(), true, m == current, None::<&str>)
        })
        .collect::<tauri::Result<Vec<_>>>()?;
    let mode_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = modes
        .iter()
        .map(|m| m as &dyn tauri::menu::IsMenuItem<Wry>)
        .collect();

    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, OPEN, "Chamar o Ekko", true, None::<&str>)?,
            &MenuItem::with_id(
                app,
                PALETTE,
                "Paleta de comandos",
                true,
                None::<&str>,
            )?,
            &Submenu::with_items(app, "Modo de exibição", true, &mode_refs)?,
            &MenuItem::with_id(app, SETTINGS, "Configurações", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, QUIT, "Sair", true, None::<&str>)?,
        ],
    )
}

fn on_menu(app: &AppHandle, event: MenuEvent) {
    let id = event.id.as_ref();
    let result = match id {
        OPEN => display::summon::summon(app, None),
        SETTINGS => commands::settings::open_settings_window(app),
        PALETTE => display::flows::toggle_palette(app),
        QUIT => {
            app.exit(0);
            Ok(())
        }
        _ => match id.strip_prefix(MODE_PREFIX).and_then(DisplayMode::from_id) {
            Some(mode) => commands::display::change_mode(app, mode),
            None => Ok(()),
        },
    };
    if let Err(err) = result {
        eprintln!("[ekko] ação do tray falhou: {err}");
    }
}

fn on_click(tray: &TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        position,
        ..
    } = event
    {
        let cursor = (position.x as i32, position.y as i32);
        if let Err(err) = display::summon::summon(tray.app_handle(), Some(cursor)) {
            eprintln!("[ekko] clique do tray falhou: {err}");
        }
    }
}
