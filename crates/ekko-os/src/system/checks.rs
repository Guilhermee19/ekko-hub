//! Pure finding builders for "Verificar meu PC" (pt-BR texts, thresholds, actions).

use super::cleanup::{DirUsage, RecycleBin};
use super::format::human_bytes;
use super::group::{self, ProcessGroup, SortBy};
use super::scan::{Check, CheckItem, CheckStatus, ScanAction};
use super::startup::StartupItem;
use super::{DiskStat, MemoryStat};

const GB: u64 = 1024 * 1024 * 1024;
const MB: u64 = 1024 * 1024;

fn group_item(g: &ProcessGroup, detail: String, warn: bool) -> CheckItem {
    let count = if g.count > 1 {
        format!(" ({} processos)", g.count)
    } else {
        String::new()
    };
    CheckItem {
        label: format!("{}{count}", g.label),
        detail,
        warn,
    }
}

pub fn memory_check(mem: &MemoryStat, groups: &[ProcessGroup]) -> Check {
    let pct = mem.percent();
    let status = if pct >= 85.0 {
        CheckStatus::Warn
    } else {
        CheckStatus::Ok
    };
    let mut finding = format!(
        "{pct:.0}% em uso ({} de {})",
        human_bytes(mem.used),
        human_bytes(mem.total)
    );
    if status == CheckStatus::Warn {
        finding.push_str("; feche o que não está usando");
    }
    let mut check = Check::new("memory", status, finding);
    check.value = Some(f64::from(pct));
    check.items = group::top(groups, SortBy::Memory, 3)
        .iter()
        .map(|g| group_item(g, human_bytes(g.memory), false))
        .collect();
    check
}

/// A single app above this share of the whole CPU is called out.
const CPU_HOG: f32 = 25.0;

pub fn cpu_check(total: f32, groups: &[ProcessGroup]) -> Check {
    let hogs: Vec<ProcessGroup> = group::top(groups, SortBy::Cpu, 3)
        .into_iter()
        .filter(|g| g.cpu >= CPU_HOG)
        .collect();
    let (status, finding) = match hogs.first() {
        Some(h) => (
            CheckStatus::Warn,
            format!("{} está usando {:.0}% do processador", h.label, h.cpu),
        ),
        None if total >= 85.0 => (CheckStatus::Warn, format!("Processador em {total:.0}%")),
        None => (
            CheckStatus::Ok,
            format!("Uso de {total:.0}% agora, nada pesando"),
        ),
    };
    let mut check = Check::new("cpu", status, finding);
    check.value = Some(f64::from(total));
    let shown = if hogs.is_empty() {
        group::top(groups, SortBy::Cpu, 3)
    } else {
        hogs
    };
    check.items = shown
        .iter()
        .map(|g| group_item(g, format!("{:.0}%", g.cpu), g.cpu >= CPU_HOG))
        .collect();
    check
}

pub fn startup_check(items: &[StartupItem]) -> Check {
    let enabled = items.iter().filter(|i| i.enabled).count();
    let (status, finding) = match enabled {
        0 => (
            CheckStatus::Ok,
            "Nenhum programa abre com o Windows".to_owned(),
        ),
        n if n >= 8 => (
            CheckStatus::Warn,
            format!("{n} programas abrem com o Windows e atrasam o início"),
        ),
        1 => (
            CheckStatus::Info,
            "1 programa abre com o Windows".to_owned(),
        ),
        n => (
            CheckStatus::Info,
            format!("{n} programas abrem com o Windows"),
        ),
    };
    let mut check = Check::new("startup", status, finding);
    check.value = Some(enabled as f64);
    check.items = items
        .iter()
        .map(|i| CheckItem {
            label: i.name.clone(),
            detail: if i.enabled {
                i.location.clone()
            } else {
                format!("{} · desativado", i.location)
            },
            warn: false,
        })
        .collect();
    if !items.is_empty() {
        check.action = Some(ScanAction::OpenStartup);
    }
    check
}

pub fn temp_check(user: &DirUsage, system: &DirUsage) -> Check {
    let total = user.bytes + system.bytes;
    let old = user.old_bytes;
    let status = match old {
        b if b >= 500 * MB => CheckStatus::Warn,
        b if b >= 50 * MB => CheckStatus::Info,
        _ => CheckStatus::Ok,
    };
    let finding = if user.old_files > 0 {
        format!(
            "{} em temporários; {} podem ser limpos",
            human_bytes(total),
            human_bytes(old)
        )
    } else {
        format!(
            "{} em temporários, nada antigo para limpar",
            human_bytes(total)
        )
    };
    let mut check = Check::new("temp", status, finding);
    check.bytes = Some(total);
    check.items = vec![
        CheckItem {
            label: "Sua pasta temporária".into(),
            detail: format!("{} em {} arquivos", human_bytes(user.bytes), user.files),
            warn: false,
        },
        CheckItem {
            label: "Temporários do Windows".into(),
            detail: if system.readable {
                format!("{} em {} arquivos", human_bytes(system.bytes), system.files)
            } else {
                "sem acesso (precisa de administrador)".into()
            },
            warn: false,
        },
    ];
    if user.old_files > 0 {
        check.action = Some(ScanAction::CleanTemp { bytes: old });
    }
    check
}

pub fn bin_check(bin: Option<RecycleBin>) -> Check {
    let Some(bin) = bin else {
        return Check::new(
            "bin",
            CheckStatus::Info,
            "Não consegui ler a lixeira".into(),
        );
    };
    let status = match bin.bytes {
        _ if bin.items == 0 => CheckStatus::Ok,
        b if b >= GB => CheckStatus::Warn,
        _ => CheckStatus::Info,
    };
    let finding = if bin.items == 0 {
        "Lixeira vazia".to_owned()
    } else {
        format!(
            "{} na lixeira ({} itens)",
            human_bytes(bin.bytes),
            bin.items
        )
    };
    let mut check = Check::new("bin", status, finding);
    check.bytes = Some(bin.bytes);
    if bin.items > 0 {
        check.action = Some(ScanAction::EmptyRecycleBin { bytes: bin.bytes });
    }
    check
}

/// Below this share of free space a drive gets a warning.
const LOW_FREE: f32 = 10.0;

pub fn disk_check(disks: &[DiskStat]) -> Check {
    let fixed: Vec<&DiskStat> = disks.iter().filter(|d| !d.removable).collect();
    let low: Vec<&&DiskStat> = fixed
        .iter()
        .filter(|d| d.free_percent() < LOW_FREE)
        .collect();
    let name = |d: &DiskStat| d.mount.trim_end_matches('\\').to_owned();
    let finding = match (low.first(), fixed.first()) {
        (Some(d), _) => format!(
            "{} com só {:.0}% livre ({})",
            name(d),
            d.free_percent(),
            human_bytes(d.available)
        ),
        (None, Some(d)) => format!("{} livres em {}", human_bytes(d.available), name(d)),
        (None, None) => "Nenhum disco encontrado".to_owned(),
    };
    let status = if low.is_empty() {
        CheckStatus::Ok
    } else {
        CheckStatus::Warn
    };
    let mut check = Check::new("disk", status, finding);
    check.items = fixed
        .iter()
        .map(|d| CheckItem {
            label: name(d),
            detail: format!(
                "{} livres de {} ({:.0}%)",
                human_bytes(d.available),
                human_bytes(d.total),
                d.free_percent()
            ),
            warn: d.free_percent() < LOW_FREE,
        })
        .collect();
    check
}
