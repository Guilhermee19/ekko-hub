//! "Is a game/video fullscreen?" Reads the foreground window (Win32) and decides with a
//! pure function, so the rules are testable with plain rects.

/// Screen rect in physical pixels (`right`/`bottom` exclusive, like Win32 `RECT`).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScreenRect {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl ScreenRect {
    pub fn new(left: i32, top: i32, right: i32, bottom: i32) -> Self {
        Self {
            left,
            top,
            right,
            bottom,
        }
    }

    fn covers(&self, other: &ScreenRect) -> bool {
        self.left <= other.left
            && self.top <= other.top
            && self.right >= other.right
            && self.bottom >= other.bottom
    }
}

/// What is in front of the user right now.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Foreground {
    /// No foreground window (e.g. while switching).
    Nothing,
    /// One of Ekko's own windows.
    Own,
    /// The desktop / shell (wallpaper clicked, taskbar).
    Shell,
    Window {
        rect: ScreenRect,
        /// Full bounds of the monitor the window is on.
        monitor: ScreenRect,
    },
}

/// True when the overlay should hide. Ekko's own windows keep the previous answer
/// (they are not a reason to show or hide).
pub fn should_hide(fg: Foreground, ekko_monitor: ScreenRect, hidden_now: bool) -> bool {
    match fg {
        Foreground::Own => hidden_now,
        Foreground::Nothing | Foreground::Shell => false,
        Foreground::Window { rect, monitor } => monitor == ekko_monitor && rect.covers(&monitor),
    }
}

/// Reads the foreground window. Non-Windows builds always report `Nothing`.
pub fn foreground() -> Foreground {
    #[cfg(windows)]
    {
        win::foreground()
    }
    #[cfg(not(windows))]
    {
        Foreground::Nothing
    }
}

#[cfg(windows)]
mod win {
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MONITOR_DEFAULTTONEAREST, MONITORINFO, MonitorFromWindow,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetDesktopWindow, GetForegroundWindow, GetShellWindow, GetWindowRect,
        GetWindowThreadProcessId,
    };

    use super::{Foreground, ScreenRect};

    /// Desktop (wallpaper) and taskbar window classes.
    const SHELL_CLASSES: &[&str] = &[
        "Progman",
        "WorkerW",
        "Shell_TrayWnd",
        "Shell_SecondaryTrayWnd",
    ];

    fn rect(r: RECT) -> ScreenRect {
        ScreenRect::new(r.left, r.top, r.right, r.bottom)
    }

    fn class_name(hwnd: HWND) -> String {
        let mut buf = [0u16; 64];
        // SAFETY: valid buffer; a stale hwnd only makes the call fail (returns 0).
        let len = unsafe { GetClassNameW(hwnd, &mut buf) };
        String::from_utf16_lossy(&buf[..len.max(0) as usize])
    }

    pub fn foreground() -> Foreground {
        // SAFETY: plain Win32 queries on a window handle; all failures are handled.
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_invalid() {
                return Foreground::Nothing;
            }
            if hwnd == GetShellWindow() || hwnd == GetDesktopWindow() {
                return Foreground::Shell;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == std::process::id() {
                return Foreground::Own;
            }
            if SHELL_CLASSES.contains(&class_name(hwnd).as_str()) {
                return Foreground::Shell;
            }
            let mut window = RECT::default();
            if GetWindowRect(hwnd, &mut window).is_err() {
                return Foreground::Nothing;
            }
            let mut info = MONITORINFO {
                cbSize: size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
            if !GetMonitorInfoW(monitor, &mut info).as_bool() {
                return Foreground::Nothing;
            }
            Foreground::Window {
                rect: rect(window),
                monitor: rect(info.rcMonitor),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAIN: ScreenRect = ScreenRect {
        left: 0,
        top: 0,
        right: 1920,
        bottom: 1080,
    };
    const SIDE: ScreenRect = ScreenRect {
        left: 1920,
        top: 0,
        right: 4480,
        bottom: 1440,
    };

    fn window(rect: ScreenRect, monitor: ScreenRect) -> Foreground {
        Foreground::Window { rect, monitor }
    }

    #[test]
    fn fullscreen_on_ekko_monitor_hides() {
        assert!(should_hide(window(MAIN, MAIN), MAIN, false));
        // Borderless games often overshoot the monitor by a few px.
        let bigger = ScreenRect::new(-8, -8, 1928, 1088);
        assert!(should_hide(window(bigger, MAIN), MAIN, false));
    }

    #[test]
    fn maximized_window_does_not_hide() {
        // Maximized = work area (taskbar still visible), not the whole monitor.
        let maximized = ScreenRect::new(0, 0, 1920, 1032);
        assert!(!should_hide(window(maximized, MAIN), MAIN, false));
    }

    #[test]
    fn fullscreen_on_another_monitor_is_ignored() {
        assert!(!should_hide(window(SIDE, SIDE), MAIN, false));
    }

    #[test]
    fn shell_shows_and_own_windows_keep_state() {
        assert!(!should_hide(Foreground::Shell, MAIN, true));
        assert!(!should_hide(Foreground::Nothing, MAIN, true));
        assert!(should_hide(Foreground::Own, MAIN, true));
        assert!(!should_hide(Foreground::Own, MAIN, false));
    }
}
