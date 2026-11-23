//! Manual probe (READ ONLY: ends nothing, cleans nothing): one telemetry snapshot, the
//! five heaviest app groups and the "Verificar meu PC" findings.
//! `cargo run -p ekko-os --example system`

use ekko_os::system::format::human_bytes;
use ekko_os::system::group::{SortBy, top};
use ekko_os::system::{Monitor, scan};

fn main() {
    let mut monitor = match Monitor::new() {
        Ok(m) => m,
        Err(err) => return println!("sysinfo indisponível: {err}"),
    };
    monitor.sample();
    monitor.processes();
    std::thread::sleep(std::time::Duration::from_millis(1500));
    let s = monitor.sample();
    let groups = monitor.processes();

    println!(
        "CPU {:.0}% ({} núcleos) {}",
        s.cpu.total,
        s.cpu.cores.len(),
        s.cpu.brand
    );
    println!(
        "RAM {} de {} ({:.0}%) · swap {} de {}",
        human_bytes(s.memory.used),
        human_bytes(s.memory.total),
        s.memory.percent(),
        human_bytes(s.memory.swap_used),
        human_bytes(s.memory.swap_total)
    );
    match &s.gpu {
        Some(g) => println!(
            "GPU {:.0}% {} · VRAM {} de {} · temperatura {:?}",
            g.usage,
            g.name.as_deref().unwrap_or("?"),
            g.vram_used.map_or("?".into(), human_bytes),
            g.vram_total.map_or("?".into(), human_bytes),
            g.temperature
        ),
        None => println!("GPU indisponível"),
    }
    for d in &s.disks {
        println!(
            "Disco {} {} livres de {}",
            d.mount,
            human_bytes(d.available),
            human_bytes(d.total)
        );
    }
    println!(
        "Rede ↓{}/s ↑{}/s · uptime {} h · {} processos · temperatura {:?}",
        human_bytes(s.network.rx_per_sec),
        human_bytes(s.network.tx_per_sec),
        s.uptime_secs / 3600,
        s.process_count,
        s.temperature
    );

    println!("\nTop 5 por memória:");
    for g in top(&groups, SortBy::Memory, 5) {
        println!(
            "  {:<28} ×{:<3} {:>9} {:>5.1}% {:?}",
            g.label,
            g.count,
            human_bytes(g.memory),
            g.cpu,
            g.protection
        );
    }

    println!("\nVerificar meu PC:");
    let checks = scan::run(&mut |_| {});
    for c in checks {
        println!(
            "  [{:?}] {}: {} {:?}",
            c.status, c.label, c.finding, c.action
        );
    }
}
