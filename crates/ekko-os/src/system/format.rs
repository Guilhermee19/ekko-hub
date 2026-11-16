//! Pure number helpers shared by the monitor, the scan and the UI texts.

/// Per-process CPU from sysinfo is "% of one core" (up to 100 × cores); the UI wants
/// "% of the whole machine" like Task Manager.
pub fn normalize_cpu(per_core_percent: f32, cores: usize) -> f32 {
    if !per_core_percent.is_finite() || per_core_percent <= 0.0 {
        return 0.0;
    }
    (per_core_percent / cores.max(1) as f32).min(100.0)
}

/// Bytes per second between two cumulative counters. A counter that went backwards
/// (adapter reset, interface removed) reads as zero instead of a huge spike.
pub fn rate(prev_total: u64, now_total: u64, elapsed_secs: f64) -> u64 {
    if elapsed_secs <= 0.0 || now_total < prev_total {
        return 0;
    }
    ((now_total - prev_total) as f64 / elapsed_secs).round() as u64
}

/// Share in percent (0 when the total is unknown).
pub fn percent(part: u64, total: u64) -> f32 {
    if total == 0 {
        return 0.0;
    }
    (part as f64 / total as f64 * 100.0) as f32
}

/// pt-BR size: "640 MB", "1,8 GB", "12 KB" (binary units, like Explorer).
pub fn human_bytes(bytes: u64) -> String {
    const UNITS: [&str; 5] = ["B", "KB", "MB", "GB", "TB"];
    let mut value = bytes as f64;
    let mut unit = 0;
    while value >= 1024.0 && unit < UNITS.len() - 1 {
        value /= 1024.0;
        unit += 1;
    }
    // One decimal only where it matters (GB and up, below 100).
    let text = if unit >= 3 && value < 100.0 {
        format!("{value:.1}")
    } else {
        format!("{value:.0}")
    };
    let text = text.strip_suffix(".0").unwrap_or(&text).replace('.', ",");
    format!("{text} {}", UNITS[unit])
}

/// "chrome.exe" → "Chrome" when the file has no description.
pub fn fallback_label(exe_name: &str) -> String {
    let stem = exe_name
        .strip_suffix(".exe")
        .or_else(|| exe_name.strip_suffix(".EXE"))
        .unwrap_or(exe_name);
    let mut chars = stem.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().chain(chars).collect(),
        None => exe_name.to_owned(),
    }
}
