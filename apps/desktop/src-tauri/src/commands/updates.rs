//! "Sobre": the installed version, a check against the latest GitHub release and the
//! one-click update (download, verify, run the installer quietly, reopen).

use ekko_integrations::Error;
use ekko_integrations::http::ReqwestTransport;
use ekko_integrations::updates::{self, Release};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use super::integrations::blocking;

/// `{ done, total }` bytes while the installer downloads.
pub const UPDATE_PROGRESS: &str = "ekko://update/progress";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current: String,
    pub latest: String,
    pub available: bool,
    pub notes: String,
    pub page_url: String,
    /// Installer size in bytes; None when the release has no installer.
    pub size: Option<u64>,
}

#[derive(Clone, Serialize)]
struct Progress {
    done: u64,
    total: u64,
}

#[tauri::command]
pub fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub async fn update_check(app: AppHandle) -> Result<UpdateInfo, String> {
    let current = app_version(app.clone());
    blocking(&app, move |_| {
        let r = fetch()?;
        Ok(UpdateInfo {
            available: r.installer.is_some() && updates::is_newer(&r.version, &current),
            latest: r.version,
            current,
            notes: r.notes,
            page_url: r.page_url,
            size: r.installer.map(|a| a.size),
        })
    })
    .await
}

/// Downloads the latest installer, checks it, starts it in passive mode (progress
/// only, then reopens Ekko) and closes Ekko so the files can be replaced.
#[tauri::command]
pub async fn update_install(app: AppHandle) -> Result<(), String> {
    // The quiet installer is Windows-only; on macOS the .dmg is swapped by hand.
    if !cfg!(windows) {
        let page = blocking(&app, |_| Ok(fetch()?.page_url)).await?;
        return crate::services::integrations::open_browser(&page).map_err(|e| e.to_string());
    }
    let current = app_version(app.clone());
    let path = blocking(&app, move |app| {
        // Asked again here: the UI never chooses what gets downloaded.
        let r = fetch()?;
        if !updates::is_newer(&r.version, &current) {
            return Err(Error::Invalid("você já está na versão mais recente".into()));
        }
        let asset = r
            .installer
            .ok_or_else(|| Error::Invalid("esta versão não tem instalador".into()))?;
        let dir = std::env::temp_dir().join("ekko-update");
        std::fs::create_dir_all(&dir)?;
        let path = dir.join(&asset.name);
        let mut last = u64::MAX;
        updates::download(&asset, &path, |done, total| {
            // One event per percent is plenty for a progress bar.
            let pct = done * 100 / total.max(1);
            if pct != last {
                last = pct;
                let _ = app.emit(UPDATE_PROGRESS, Progress { done, total });
            }
        })?;
        Ok(path)
    })
    .await?;
    std::process::Command::new(&path)
        .args(["/P", "/R", "/UPDATE"])
        .spawn()
        .map_err(|e| format!("não foi possível abrir o instalador: {e}"))?;
    app.exit(0);
    Ok(())
}

fn fetch() -> Result<Release, Error> {
    updates::latest(&ReqwestTransport::new()?)
}
