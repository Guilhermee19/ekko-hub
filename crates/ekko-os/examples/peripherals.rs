//! Prints the wireless USB batteries Ekko sees, every 5 s:
//! `cargo run -p ekko-os --example peripherals [seconds]` (default 10).

use std::time::{Duration, Instant};

fn main() {
    let secs = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);
    let start = Instant::now();
    // The scanner starts on the first call; mice push a frame every ~2 s (needs two).
    let _ = ekko_os::peripherals::batteries();
    while start.elapsed() < Duration::from_secs(secs) {
        std::thread::sleep(Duration::from_secs(5));
        let t = start.elapsed().as_secs();
        for d in ekko_os::peripherals::batteries() {
            let plug = if d.charging { " (no cabo)" } else { "" };
            println!("{t:>3}s  {:?} {}: {}%{plug}", d.kind, d.name, d.percent);
        }
    }
}
