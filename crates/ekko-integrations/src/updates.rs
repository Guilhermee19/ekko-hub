//! Updates from the project's GitHub Releases: the latest release, whether it is newer
//! than this build, and a verified download of its installer. Only assets of this
//! repository are accepted, and the file must match the size and SHA-256 GitHub reports.

use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::time::Duration;

use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::http::{Method, Request, Transport};
use crate::{Error, Result};

pub const REPO: &str = "Guilhermee19/ekko-hub";
const API: &str = "https://api.github.com/repos/Guilhermee19/ekko-hub/releases/latest";
/// Where this repo's release files are served from; any other URL is refused.
const DOWNLOADS: &str = "https://github.com/Guilhermee19/ekko-hub/releases/download/";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Asset {
    pub name: String,
    pub url: String,
    pub size: u64,
    /// Hex SHA-256, when GitHub reports one.
    pub sha256: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Release {
    /// "0.5.0", without the "v".
    pub version: String,
    pub notes: String,
    pub page_url: String,
    /// The Windows installer (`*-setup.exe`), if the release has one.
    pub installer: Option<Asset>,
}

/// Asks GitHub for the latest published release.
pub fn latest(transport: &dyn Transport) -> Result<Release> {
    let res = transport.send(&Request::new(Method::Get, API))?;
    if res.status == 404 {
        return Err(Error::Invalid("nenhuma versão publicada ainda".into()));
    }
    if !res.ok() {
        return Err(res.error());
    }
    parse_release(&res.body)
}

/// The `/releases/latest` JSON → what Ekko needs.
pub fn parse_release(body: &str) -> Result<Release> {
    let v: Value = serde_json::from_str(body).map_err(|e| Error::Parse(e.to_string()))?;
    let tag = v["tag_name"]
        .as_str()
        .ok_or_else(|| Error::Parse("release sem tag".into()))?;
    let installer = v["assets"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(asset)
        .find(|a| a.name.ends_with("-setup.exe"));
    Ok(Release {
        version: tag.trim_start_matches('v').to_owned(),
        notes: v["body"].as_str().unwrap_or_default().trim().to_owned(),
        page_url: v["html_url"].as_str().unwrap_or_default().to_owned(),
        installer,
    })
}

fn asset(v: &Value) -> Option<Asset> {
    let name = v["name"].as_str()?;
    let url = v["browser_download_url"].as_str()?;
    // A plain file name from this repo's downloads, nothing that could escape a folder.
    if name.contains(['/', '\\']) || name.starts_with('.') || !url.starts_with(DOWNLOADS) {
        return None;
    }
    Some(Asset {
        name: name.to_owned(),
        url: url.to_owned(),
        size: v["size"].as_u64()?,
        sha256: v["digest"]
            .as_str()
            .and_then(|d| d.strip_prefix("sha256:"))
            .map(str::to_ascii_lowercase),
    })
}

/// Is `latest` a newer version than `current`? "1.2.3" style; a pre-release
/// ("1.2.3-beta") counts as older than the same plain version.
pub fn is_newer(latest: &str, current: &str) -> bool {
    match (parse_version(latest), parse_version(current)) {
        (Some(l), Some(c)) => l > c,
        _ => false,
    }
}

/// (major, minor, patch, 1 when not a pre-release), so tuples compare as versions.
fn parse_version(v: &str) -> Option<(u64, u64, u64, u8)> {
    let v = v.trim().trim_start_matches('v');
    let (core, pre) = match v.split_once('-') {
        Some((core, _)) => (core, 0),
        None => (v, 1),
    };
    let mut parts = core.split('.').map(|p| p.parse::<u64>().ok());
    let major = parts.next()??;
    let minor = parts.next().unwrap_or(Some(0))?;
    let patch = parts.next().unwrap_or(Some(0))?;
    Some((major, minor, patch, pre))
}

/// Downloads `asset` to `dest`, reporting (bytes so far, total). The file is removed
/// unless it has exactly the expected size and SHA-256.
pub fn download(asset: &Asset, dest: &Path, mut progress: impl FnMut(u64, u64)) -> Result<()> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(concat!("ekko-hub/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| Error::Network(e.to_string()))?;
    let mut res = client
        .get(&asset.url)
        .send()
        .map_err(|e| Error::Network(e.without_url().to_string()))?;
    if !res.status().is_success() {
        return Err(Error::Api {
            status: res.status().as_u16(),
            message: "não foi possível baixar o instalador".into(),
        });
    }
    let result = save(&mut res, dest, asset, &mut progress);
    if result.is_err() {
        let _ = std::fs::remove_file(dest);
    }
    result
}

fn save(
    src: &mut impl Read,
    dest: &Path,
    asset: &Asset,
    progress: &mut impl FnMut(u64, u64),
) -> Result<()> {
    let mut file = File::create(dest)?;
    let mut hash = Sha256::new();
    let mut buf = vec![0u8; 64 * 1024];
    let mut done = 0u64;
    loop {
        let n = src.read(&mut buf)?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n])?;
        hash.update(&buf[..n]);
        done += n as u64;
        if done > asset.size {
            return Err(Error::Invalid(
                "o instalador veio maior que o esperado".into(),
            ));
        }
        progress(done, asset.size);
    }
    file.flush()?;
    check(done, &hex(&hash.finalize()), asset)
}

/// The downloaded bytes must be exactly what GitHub says the asset is.
fn check(size: u64, sha256: &str, asset: &Asset) -> Result<()> {
    if size != asset.size {
        return Err(Error::Invalid(
            "o download veio incompleto, tente de novo".into(),
        ));
    }
    if asset.sha256.as_deref().is_some_and(|want| want != sha256) {
        return Err(Error::Invalid(
            "o instalador não bate com o publicado (hash diferente)".into(),
        ));
    }
    Ok(())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const RELEASE: &str = r#"{
        "tag_name": "v0.5.0",
        "html_url": "https://github.com/Guilhermee19/ekko-hub/releases/tag/v0.5.0",
        "body": "  Novidades  ",
        "assets": [
            {"name": "evil.exe", "size": 1,
             "browser_download_url": "https://example.com/evil-setup.exe"},
            {"name": "Ekko_0.5.0_x64-setup.exe", "size": 3,
             "digest": "sha256:BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD",
             "browser_download_url": "https://github.com/Guilhermee19/ekko-hub/releases/download/v0.5.0/Ekko_0.5.0_x64-setup.exe"}
        ]
    }"#;

    #[test]
    fn reads_the_release_and_its_installer() {
        let r = parse_release(RELEASE).unwrap();
        assert_eq!(r.version, "0.5.0");
        assert_eq!(r.notes, "Novidades");
        let a = r.installer.unwrap();
        assert_eq!(a.name, "Ekko_0.5.0_x64-setup.exe");
        assert_eq!(a.size, 3);
        assert_eq!(
            a.sha256.as_deref(),
            Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        );
    }

    #[test]
    fn refuses_files_from_elsewhere_or_with_paths() {
        let foreign = r#"{"tag_name":"v1.0.0","assets":[{"name":"x-setup.exe","size":1,
            "browser_download_url":"https://evil.test/x-setup.exe"}]}"#;
        assert!(parse_release(foreign).unwrap().installer.is_none());
        let sneaky = r#"{"tag_name":"v1.0.0","assets":[{"name":"..\\x-setup.exe","size":1,
            "browser_download_url":"https://github.com/Guilhermee19/ekko-hub/releases/download/v1/x-setup.exe"}]}"#;
        assert!(parse_release(sneaky).unwrap().installer.is_none());
    }

    #[test]
    fn compares_versions() {
        assert!(is_newer("0.5.0", "0.4.0"));
        assert!(is_newer("v0.10.0", "0.9.9"));
        assert!(is_newer("1.0.0", "1.0.0-beta"));
        assert!(!is_newer("0.4.0", "0.4.0"));
        assert!(!is_newer("0.3.9", "0.4.0"));
        assert!(!is_newer("lixo", "0.4.0"));
    }

    #[test]
    fn saves_only_a_matching_file() {
        let dir = std::env::temp_dir().join(format!("ekko-update-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let dest = dir.join("setup.exe");
        let asset = parse_release(RELEASE).unwrap().installer.unwrap();
        let mut seen = Vec::new();
        save(&mut &b"abc"[..], &dest, &asset, &mut |d, t| {
            seen.push((d, t))
        })
        .unwrap();
        assert_eq!(seen.last(), Some(&(3, 3)));
        assert!(save(&mut &b"abd"[..], &dest, &asset, &mut |_, _| {}).is_err());
        assert!(save(&mut &b"ab"[..], &dest, &asset, &mut |_, _| {}).is_err());
        assert!(save(&mut &b"abcd"[..], &dest, &asset, &mut |_, _| {}).is_err());
        let _ = std::fs::remove_dir_all(dir);
    }
}
