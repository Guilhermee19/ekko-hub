//! Lets a `.env` at the repo root provide the build-time values read with
//! `option_env!` (see `.env.example`). A real environment variable always wins, which
//! is how the release workflow passes them.

use std::path::Path;

const KEYS: [&str; 3] = [
    "EKKO_GOOGLE_CLIENT_ID",
    "EKKO_GOOGLE_CLIENT_SECRET",
    "EKKO_MS_CLIENT_ID",
];

fn main() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    println!("cargo:rerun-if-changed=build.rs");
    for key in KEYS {
        println!("cargo:rerun-if-env-changed={key}");
    }
    let Ok(text) = std::fs::read_to_string(&file) else {
        // Not watched while missing: cargo would rebuild this crate on every build.
        return;
    };
    println!("cargo:rerun-if-changed={}", file.display());
    for (key, value) in text.lines().filter_map(parse) {
        let from_env = std::env::var(key).is_ok_and(|v| !v.trim().is_empty());
        if KEYS.contains(&key) && !value.is_empty() && !from_env {
            println!("cargo:rustc-env={key}={value}");
        }
    }
}

/// `KEY=value`, ignoring blanks and `#` comments; quotes around the value are optional.
fn parse(line: &str) -> Option<(&str, &str)> {
    let line = line.trim();
    if line.is_empty() || line.starts_with('#') {
        return None;
    }
    let (key, value) = line.split_once('=')?;
    Some((key.trim(), value.trim().trim_matches(['"', '\''])))
}
