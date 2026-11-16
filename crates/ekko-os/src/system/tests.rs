use std::path::Path;
use std::time::{Duration, SystemTime};

use super::checks::{bin_check, cpu_check, disk_check, memory_check, startup_check, temp_check};
use super::cleanup::{DirUsage, RecycleBin, is_older, is_safe_temp_root};
use super::format::{fallback_label, human_bytes, normalize_cpu, percent, rate};
use super::gpu::{busiest, luid_key, luid_of, per_adapter};
use super::group::{ProcSample, SortBy, group, own_tree, sort, top};
use super::history::{HISTORY_LEN, History, HistoryPoint};
use super::kill::{KillError, plan_group, plan_pid};
use super::scan::{CheckStatus, ScanAction};
use super::startup::{StartupItem, approved_enabled};
use super::{DiskStat, MemoryStat, Protection, protection};

const GB: u64 = 1024 * 1024 * 1024;
const MB: u64 = 1024 * 1024;

fn proc(pid: u32, name: &str, cpu: f32, memory: u64) -> ProcSample {
    ProcSample {
        pid,
        parent: None,
        name: name.into(),
        exe: Some(format!(r"C:\Apps\{name}")),
        cpu,
        memory,
    }
}

fn no_desc(_: &str) -> Option<String> {
    None
}

#[test]
fn cpu_is_normalized_by_core_count() {
    assert_eq!(normalize_cpu(400.0, 8), 50.0);
    assert_eq!(normalize_cpu(1600.0, 8), 100.0);
    assert_eq!(normalize_cpu(-1.0, 8), 0.0);
    assert_eq!(normalize_cpu(f32::NAN, 8), 0.0);
    assert_eq!(normalize_cpu(30.0, 0), 30.0);
}

#[test]
fn rate_handles_resets_and_zero_time() {
    assert_eq!(rate(1_000, 4_000, 1.5), 2_000);
    assert_eq!(rate(5_000, 1_000, 1.0), 0);
    assert_eq!(rate(0, 1_000, 0.0), 0);
    assert_eq!(percent(1, 4), 25.0);
    assert_eq!(percent(1, 0), 0.0);
}

#[test]
fn human_bytes_in_pt_br() {
    assert_eq!(human_bytes(0), "0 B");
    assert_eq!(human_bytes(12 * 1024), "12 KB");
    assert_eq!(human_bytes(640 * MB), "640 MB");
    assert_eq!(human_bytes(GB * 18 / 10), "1,8 GB");
    assert_eq!(human_bytes(2 * GB), "2 GB");
    assert_eq!(human_bytes(490 * GB), "490 GB");
}

#[test]
fn fallback_label_cleans_exe_names() {
    assert_eq!(fallback_label("chrome.exe"), "Chrome");
    assert_eq!(fallback_label("Registry"), "Registry");
    assert_eq!(fallback_label(""), "");
}

#[test]
fn groups_sum_by_executable() {
    let samples = vec![
        proc(10, "chrome.exe", 80.0, 300 * MB),
        proc(11, "chrome.exe", 40.0, 500 * MB),
        proc(12, "Chrome.exe", 0.0, 100 * MB),
        proc(20, "code.exe", 8.0, 700 * MB),
        proc(0, "System Idle Process", 700.0, 0),
    ];
    let mut describe = |p: &str| p.contains("chrome").then(|| "Google Chrome".to_owned());
    let mut groups = group(&samples, 8, &mut describe);
    sort(&mut groups, SortBy::Memory);
    assert_eq!(groups.len(), 2, "pid 0 is skipped");
    let chrome = &groups[0];
    assert_eq!(chrome.label, "Google Chrome");
    assert_eq!(chrome.count, 3);
    assert_eq!(chrome.memory, 900 * MB);
    assert_eq!(chrome.cpu, 15.0);
    assert_eq!(chrome.processes[0].pid, 11, "biggest process first");
    assert_eq!(groups[1].label, "Code");
    assert_eq!(top(&groups, SortBy::Cpu, 1)[0].name, "chrome.exe");
    sort(&mut groups, SortBy::Name);
    assert_eq!(groups[0].label, "Code");
}

#[test]
fn protection_list() {
    for name in [
        "System",
        "svchost.exe",
        "LSASS.EXE",
        "csrss.exe",
        "dwm.exe",
        "MsMpEng.exe",
    ] {
        assert_eq!(protection(name), Protection::Protected, "{name}");
    }
    assert_eq!(protection("explorer.exe"), Protection::Warn);
    assert_eq!(protection("chrome.exe"), Protection::Ok);
    let groups = group(&[proc(4, "weird.exe", 0.0, 1)], 1, &mut no_desc);
    assert_eq!(
        groups[0].protection,
        Protection::Protected,
        "pid 4 is the kernel"
    );
}

#[test]
fn kill_plans_refuse_protected_and_own_tree() {
    let me = std::process::id();
    let mut child = proc(900_001, "msedgewebview2.exe", 0.0, 1);
    child.parent = Some(me);
    let samples = vec![
        proc(me, "ekko-desktop.exe", 0.0, 1),
        child,
        proc(900_002, "msedgewebview2.exe", 0.0, 1),
        proc(900_003, "svchost.exe", 0.0, 1),
        proc(900_004, "notepad.exe", 0.0, 1),
    ];
    assert_eq!(own_tree(&samples, me).len(), 2);
    assert_eq!(
        plan_group(&samples, "msedgewebview2.exe"),
        Ok(vec![900_002])
    );
    assert!(matches!(
        plan_group(&samples, "svchost.exe"),
        Err(KillError::Protected(_))
    ));
    assert_eq!(
        plan_group(&samples, "nothing.exe"),
        Err(KillError::NotFound)
    );
    assert_eq!(plan_pid(&samples, 900_004), Ok("notepad.exe".into()));
    assert!(matches!(
        plan_pid(&samples, 900_001),
        Err(KillError::Protected(_))
    ));
    assert!(matches!(
        plan_pid(&samples, me),
        Err(KillError::Protected(_))
    ));
    assert_eq!(plan_pid(&samples, 1), Err(KillError::NotFound));
}

#[test]
fn gpu_sums_engines_per_adapter() {
    let a = "pid_100_luid_0x00000000_0x0000D1F2_phys_0_eng_0_engtype_3D";
    let b = "pid_200_luid_0x00000000_0x0000D1F2_phys_0_eng_0_engtype_3D";
    let c = "pid_300_luid_0x00000000_0x0000AAAA_phys_0_eng_0_engtype_3D";
    assert_eq!(luid_of(a).as_deref(), Some("0x00000000_0x0000d1f2"));
    assert_eq!(luid_of("garbage"), None);
    let rows = vec![(a.into(), 70.0), (b.into(), 50.0), (c.into(), 10.0)];
    assert_eq!(per_adapter(&rows, 100.0)["0x00000000_0x0000d1f2"], 100.0);
    assert_eq!(
        busiest(&rows),
        Some(("0x00000000_0x0000d1f2".into(), 100.0))
    );
    assert_eq!(busiest(&[]), None);
    assert_eq!(luid_key(0, 0xD1F2), "0x00000000_0x0000d1f2");
}

#[test]
fn history_keeps_the_last_samples() {
    let mut h = History::default();
    for i in 0..(HISTORY_LEN as u64 + 5) {
        h.push(HistoryPoint {
            at_ms: i,
            cpu: 0.0,
            ram: 0.0,
            gpu: None,
            disk: None,
            net: 0,
            temp: None,
        });
    }
    assert_eq!(h.len(), HISTORY_LEN);
    assert_eq!(h.points()[0].at_ms, 5);
}

#[test]
fn startup_approved_flag() {
    assert!(approved_enabled(None));
    assert!(approved_enabled(Some(&[2, 0, 0])));
    assert!(approved_enabled(Some(&[6])));
    assert!(!approved_enabled(Some(&[3, 0])));
    assert!(!approved_enabled(Some(&[7])));
}

#[test]
fn temp_root_must_be_the_users() {
    let local = Path::new(r"C:\Users\Ana\AppData\Local");
    assert!(is_safe_temp_root(
        Path::new(r"C:\Users\Ana\AppData\Local\Temp"),
        local
    ));
    assert!(is_safe_temp_root(
        Path::new(r"c:\users\ana\appdata\local\temp\2"),
        local
    ));
    assert!(!is_safe_temp_root(Path::new(r"C:\Windows\Temp"), local));
    assert!(!is_safe_temp_root(
        Path::new(r"C:\Users\Ana\AppData\Local"),
        local
    ));
    assert!(!is_safe_temp_root(Path::new(r"C:\"), local));
    let now = SystemTime::now();
    assert!(is_older(
        Some(now - Duration::from_secs(90_000)),
        now - Duration::from_secs(86_400)
    ));
    assert!(!is_older(Some(now), now - Duration::from_secs(86_400)));
    assert!(!is_older(None, now));
}

#[test]
fn findings() {
    let groups = group(
        &[
            proc(1, "chrome.exe", 400.0, 3 * GB),
            proc(2, "code.exe", 8.0, GB),
        ],
        8,
        &mut no_desc,
    );
    let mem = MemoryStat {
        used: 14 * GB,
        total: 16 * GB,
        swap_used: 0,
        swap_total: 0,
    };
    let m = memory_check(&mem, &groups);
    assert_eq!(m.status, CheckStatus::Warn);
    assert_eq!(m.items[0].label, "Chrome");

    let c = cpu_check(60.0, &groups);
    assert_eq!(c.status, CheckStatus::Warn);
    assert!(
        c.finding.contains("Chrome está usando 50%"),
        "{}",
        c.finding
    );

    let item = |enabled| StartupItem {
        name: "X".into(),
        command: "x.exe".into(),
        location: "Registro (usuário)".into(),
        enabled,
    };
    let s = startup_check(&[item(true), item(false)]);
    assert_eq!((s.status, s.value), (CheckStatus::Info, Some(1.0)));
    assert_eq!(s.action, Some(ScanAction::OpenStartup));
    assert_eq!(
        startup_check(&vec![item(true); 9]).status,
        CheckStatus::Warn
    );

    let user = DirUsage {
        bytes: GB,
        files: 10,
        old_bytes: 600 * MB,
        old_files: 4,
        readable: true,
    };
    let t = temp_check(&user, &DirUsage::default());
    assert_eq!(t.status, CheckStatus::Warn);
    assert_eq!(t.action, Some(ScanAction::CleanTemp { bytes: 600 * MB }));

    assert_eq!(
        bin_check(Some(RecycleBin { bytes: 0, items: 0 })).status,
        CheckStatus::Ok
    );
    let b = bin_check(Some(RecycleBin {
        bytes: 2 * GB,
        items: 3,
    }));
    assert_eq!(
        b.action,
        Some(ScanAction::EmptyRecycleBin { bytes: 2 * GB })
    );

    let disk = |mount: &str, available| DiskStat {
        mount: mount.into(),
        label: String::new(),
        total: 100 * GB,
        available,
        removable: false,
    };
    assert_eq!(disk_check(&[disk(r"C:\", 40 * GB)]).status, CheckStatus::Ok);
    let low = disk_check(&[disk(r"C:\", 40 * GB), disk(r"D:\", 5 * GB)]);
    assert_eq!(low.status, CheckStatus::Warn);
    assert!(low.finding.starts_with("D: com só 5%"), "{}", low.finding);
}
