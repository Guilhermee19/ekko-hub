//! "Finalizar tarefa": asks the app to close (WM_CLOSE to its windows), then terminates
//! whatever is still running after a short grace period. Protected processes, kernel
//! pids and Ekko's own process tree are refused before anything is touched.

use serde::Serialize;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};

use super::group::{ProcSample, own_tree};
use super::monitor::samples;
use super::protect::{Protection, protected_pid, protection};

/// How long a window gets to close by itself before it is terminated.
pub const GRACE_MS: u32 = 3000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum KillOutcome {
    /// Closed itself after WM_CLOSE (or with its parent).
    Closed,
    Terminated,
    /// Already gone when we got to it.
    Gone,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PidResult {
    pub pid: u32,
    pub outcome: KillOutcome,
    pub error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KillReport {
    pub name: String,
    pub results: Vec<PidResult>,
    pub ended: usize,
    pub failed: usize,
}

impl KillReport {
    pub fn new(name: &str, results: Vec<PidResult>) -> Self {
        let failed = results
            .iter()
            .filter(|r| r.outcome == KillOutcome::Failed)
            .count();
        Self {
            name: name.to_owned(),
            ended: results.len() - failed,
            failed,
            results,
        }
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum KillError {
    #[error("{0} é um processo protegido do Windows e não pode ser finalizado")]
    Protected(String),
    #[error("processo não encontrado (talvez já tenha fechado)")]
    NotFound,
    #[error("não consegui listar os processos: {0}")]
    Os(String),
}

/// Pids to end for group `name` (case-insensitive), refusing protected names and
/// skipping Ekko's own tree (its WebView2 children share names with other apps).
pub fn plan_group(samples: &[ProcSample], name: &str) -> Result<Vec<u32>, KillError> {
    if protection(name) == Protection::Protected {
        return Err(KillError::Protected(name.to_owned()));
    }
    let own = own_tree(samples, std::process::id());
    let mut pids: Vec<u32> = samples
        .iter()
        .filter(|s| s.name.eq_ignore_ascii_case(name))
        .map(|s| s.pid)
        .filter(|pid| !protected_pid(*pid) && !own.contains(pid))
        .collect();
    pids.sort_unstable();
    if pids.is_empty() {
        return Err(KillError::NotFound);
    }
    Ok(pids)
}

/// Same rules for a single pid; returns its executable name.
pub fn plan_pid(samples: &[ProcSample], pid: u32) -> Result<String, KillError> {
    let sample = samples
        .iter()
        .find(|s| s.pid == pid)
        .ok_or(KillError::NotFound)?;
    let own = own_tree(samples, std::process::id());
    if protected_pid(pid) || own.contains(&pid) || protection(&sample.name) == Protection::Protected
    {
        return Err(KillError::Protected(sample.name.clone()));
    }
    Ok(sample.name.clone())
}

/// Ends every (non-protected) process named `name`.
pub fn kill_group(name: &str) -> Result<KillReport, KillError> {
    let pids = plan_group(&current()?, name)?;
    Ok(KillReport::new(name, end(&pids)))
}

pub fn kill_pid(pid: u32) -> Result<KillReport, KillError> {
    let name = plan_pid(&current()?, pid)?;
    Ok(KillReport::new(&name, end(&[pid])))
}

/// Fresh process list (names and parents only) so the decision uses live pids.
fn current() -> Result<Vec<ProcSample>, KillError> {
    let mut sys = System::new().map_err(|e| KillError::Os(e.to_string()))?;
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());
    Ok(samples(&sys))
}

fn end(pids: &[u32]) -> Vec<PidResult> {
    #[cfg(windows)]
    {
        win::end(pids)
    }
    #[cfg(not(windows))]
    {
        pids.iter()
            .map(|&pid| PidResult {
                pid,
                outcome: KillOutcome::Failed,
                error: Some("só no Windows".into()),
            })
            .collect()
    }
}

#[cfg(windows)]
mod win {
    use std::time::{Duration, Instant};

    use windows::Win32::Foundation::{CloseHandle, HANDLE, HWND, LPARAM, WAIT_OBJECT_0, WPARAM};
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE, PROCESS_TERMINATE,
        TerminateProcess, WaitForSingleObject,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowThreadProcessId, IsWindowVisible, PostMessageW, WM_CLOSE,
    };
    use windows::core::BOOL;

    use super::{GRACE_MS, KillOutcome, PidResult};

    struct Proc {
        pid: u32,
        handle: Option<HANDLE>,
        result: Option<PidResult>,
    }

    fn result(pid: u32, outcome: KillOutcome, error: Option<String>) -> Option<PidResult> {
        Some(PidResult {
            pid,
            outcome,
            error,
        })
    }

    pub fn end(pids: &[u32]) -> Vec<PidResult> {
        let access = PROCESS_TERMINATE | PROCESS_SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION;
        let mut procs: Vec<Proc> = pids
            .iter()
            .map(|&pid| {
                // SAFETY: plain handle open; closed at the end of this function.
                match unsafe { OpenProcess(access, false, pid) } {
                    Ok(h) => Proc {
                        pid,
                        handle: Some(h),
                        result: None,
                    },
                    Err(err) => Proc {
                        pid,
                        handle: None,
                        result: result(pid, KillOutcome::Failed, Some(denied(&err))),
                    },
                }
            })
            .collect();

        let posted = close_windows(pids);
        if posted > 0 {
            wait_all(
                &mut procs,
                Duration::from_millis(u64::from(GRACE_MS)),
                KillOutcome::Closed,
            );
        } else {
            // No window: nothing to ask nicely, but children may already be exiting.
            wait_all(&mut procs, Duration::ZERO, KillOutcome::Gone);
        }
        for p in procs.iter_mut().filter(|p| p.result.is_none()) {
            let Some(h) = p.handle else { continue };
            // SAFETY: `h` is a live handle opened with PROCESS_TERMINATE.
            p.result = match unsafe { TerminateProcess(h, 1) } {
                Ok(()) => {
                    // SAFETY: same handle, opened with SYNCHRONIZE.
                    unsafe { WaitForSingleObject(h, 1000) };
                    result(p.pid, KillOutcome::Terminated, None)
                }
                Err(err) => result(p.pid, KillOutcome::Failed, Some(denied(&err))),
            };
        }
        procs
            .into_iter()
            .map(|p| {
                if let Some(h) = p.handle {
                    // SAFETY: opened above, closed once.
                    let _ = unsafe { CloseHandle(h) };
                }
                p.result.unwrap_or(PidResult {
                    pid: p.pid,
                    outcome: KillOutcome::Failed,
                    error: None,
                })
            })
            .collect()
    }

    fn denied(err: &windows::core::Error) -> String {
        if err.code().0 as u32 == 0x8007_0005 {
            "sem permissão (processo do sistema ou de outro usuário)".into()
        } else {
            err.message()
        }
    }

    /// Marks processes that exit within `budget` (shared by all of them).
    fn wait_all(procs: &mut [Proc], budget: Duration, outcome: KillOutcome) {
        let deadline = Instant::now() + budget;
        for p in procs.iter_mut().filter(|p| p.result.is_none()) {
            let Some(h) = p.handle else { continue };
            let left = deadline.saturating_duration_since(Instant::now());
            // SAFETY: live handle opened with SYNCHRONIZE.
            if unsafe { WaitForSingleObject(h, left.as_millis() as u32) } == WAIT_OBJECT_0 {
                p.result = result(p.pid, outcome, None);
            }
        }
    }

    struct Search<'a> {
        pids: &'a [u32],
        windows: Vec<HWND>,
    }

    unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
        // SAFETY: `lparam` is the `Search` passed by `close_windows`, alive for the call.
        let search = unsafe { &mut *(lparam.0 as *mut Search) };
        let mut pid = 0u32;
        // SAFETY: plain window queries on a handle given by EnumWindows.
        unsafe {
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if search.pids.contains(&pid) && IsWindowVisible(hwnd).as_bool() {
                search.windows.push(hwnd);
            }
        }
        BOOL(1)
    }

    /// Posts WM_CLOSE to every visible top-level window of `pids`; returns how many.
    fn close_windows(pids: &[u32]) -> usize {
        let mut search = Search {
            pids,
            windows: Vec::new(),
        };
        // SAFETY: the callback only runs during this call, while `search` is alive.
        let _ = unsafe { EnumWindows(Some(collect), LPARAM(&mut search as *mut Search as isize)) };
        search
            .windows
            .iter()
            // SAFETY: posting a message to a possibly-stale hwnd just fails.
            .filter(|&&hwnd| {
                unsafe { PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0)) }.is_ok()
            })
            .count()
    }
}
