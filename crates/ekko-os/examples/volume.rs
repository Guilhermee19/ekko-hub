//! Manual probe: prints the Windows master volume (read only).
//! `cargo run -p ekko-os --example volume`

fn main() {
    match ekko_os::volume::get() {
        Ok(v) => println!("level={:.0}% muted={}", v.level * 100.0, v.muted),
        Err(err) => println!("volume indisponível: {err}"),
    }
}
