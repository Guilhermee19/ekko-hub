//! Pure window-placement math, in physical pixels. No Tauri types, so it is unit-tested.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

impl Rect {
    pub const fn new(x: i32, y: i32, w: i32, h: i32) -> Self {
        Self { x, y, w, h }
    }

    pub fn right(&self) -> i32 {
        self.x + self.w
    }

    pub fn bottom(&self) -> i32 {
        self.y + self.h
    }

    pub fn contains(&self, px: i32, py: i32) -> bool {
        px >= self.x && px < self.right() && py >= self.y && py < self.bottom()
    }
}

/// Notch window + where the pill's center sits inside it (`anchor`, px from its left).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NotchPlacement {
    pub window: Rect,
    pub anchor: i32,
}

/// Notch hugs the very top of the monitor (not the work area). `offset` is where the
/// pill's center goes, as a fraction of the monitor width. The (wide, transparent)
/// window stays inside the monitor and the pill shifts inside it, so the pill can
/// still reach the edges.
pub fn notch(monitor: Rect, w: i32, h: i32, offset: f64) -> NotchPlacement {
    let center = monitor.x + (f64::from(monitor.w) * offset.clamp(0.0, 1.0)).round() as i32;
    let x = clamp(center - w / 2, monitor.x, monitor.right() - w);
    NotchPlacement {
        window: Rect::new(x, monitor.y, w, h),
        anchor: center - x,
    }
}

/// Inverse of [`notch`]: the offset that puts the pill center at `center_x`.
pub fn notch_offset(monitor: Rect, center_x: i32) -> f64 {
    if monitor.w <= 0 {
        return 0.5;
    }
    (f64::from(center_x - monitor.x) / f64::from(monitor.w)).clamp(0.0, 1.0)
}

/// Tray flyout: centered on the cursor, clamped to the work area, and stuck to the
/// taskbar side. Same rule as claude-usage-tray `popup._place`.
pub fn tray_flyout(work: Rect, cursor: (i32, i32), w: i32, h: i32, margin: i32) -> Rect {
    let x = clamp(cursor.0 - w / 2, work.x + margin, work.right() - w - margin);
    let taskbar_at_bottom = cursor.1 >= work.y + work.h / 2;
    let y = if taskbar_at_bottom {
        work.bottom() - h - margin
    } else {
        work.y + margin
    };
    Rect::new(x, y, w, h)
}

/// Full-height strip glued to one edge of the work area.
pub fn dock(work: Rect, right_side: bool, w: i32) -> Rect {
    let x = if right_side { work.right() - w } else { work.x };
    Rect::new(x, work.y, w, work.h)
}

/// Saved orb position clamped back on screen (monitor may have changed), or the
/// bottom-right corner by default.
pub fn orb(work: Rect, size: i32, saved: Option<(i32, i32)>, margin: i32) -> Rect {
    let (x, y) = saved.unwrap_or((
        work.right() - size - margin,
        work.bottom() - size - margin * 3,
    ));
    Rect::new(
        clamp(x, work.x, work.right() - size),
        clamp(y, work.y, work.bottom() - size),
        size,
        size,
    )
}

/// Popover next to an anchor (the orb): prefers left of it, flips right if no room.
pub fn beside(work: Rect, anchor: Rect, w: i32, h: i32, gap: i32) -> Rect {
    let left = anchor.x - w - gap;
    let x = if left >= work.x {
        left
    } else {
        anchor.right() + gap
    };
    let y = clamp(anchor.bottom() - h, work.y + gap, work.bottom() - h - gap);
    Rect::new(clamp(x, work.x, work.right() - w), y, w, h)
}

/// Taskbar widget: at the left end of the taskbar strip (the part of the monitor the
/// work area leaves out). With an auto-hidden taskbar there is no strip, so it takes
/// the bottom `fallback_h` px of the monitor.
pub fn taskbar_widget(monitor: Rect, work: Rect, w: i32, fallback_h: i32, margin: i32) -> Rect {
    let strip = if work.bottom() < monitor.bottom() {
        Rect::new(
            monitor.x,
            work.bottom(),
            monitor.w,
            monitor.bottom() - work.bottom(),
        )
    } else if work.y > monitor.y {
        Rect::new(monitor.x, monitor.y, monitor.w, work.y - monitor.y)
    } else if work.x > monitor.x {
        // Vertical taskbar on the left: the widget becomes a square at its top.
        let side = work.x - monitor.x;
        return Rect::new(monitor.x, monitor.y + margin, side, side);
    } else if work.right() < monitor.right() {
        let side = monitor.right() - work.right();
        return Rect::new(work.right(), monitor.y + margin, side, side);
    } else {
        Rect::new(
            monitor.x,
            monitor.bottom() - fallback_h,
            monitor.w,
            fallback_h,
        )
    };
    Rect::new(strip.x + margin, strip.y, w.min(strip.w), strip.h)
}

/// Panel opened from the taskbar widget: left-aligned with it, glued to the taskbar.
pub fn above_widget(work: Rect, anchor: Rect, w: i32, h: i32, margin: i32) -> Rect {
    let x = clamp(anchor.x, work.x + margin, work.right() - w - margin);
    let y = if anchor.y >= work.y + work.h / 2 {
        work.bottom() - h - margin
    } else {
        work.y + margin
    };
    Rect::new(x, y, w, h)
}

pub fn centered(work: Rect, w: i32, h: i32) -> Rect {
    Rect::new(
        work.x + (work.w - w) / 2,
        work.y + (work.h - h) / 2,
        w.min(work.w),
        h.min(work.h),
    )
}

/// Like `i32::clamp` but never panics when the window is larger than the area.
fn clamp(v: i32, lo: i32, hi: i32) -> i32 {
    if hi < lo { lo } else { v.clamp(lo, hi) }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MONITOR: Rect = Rect::new(0, 0, 1920, 1080);
    const WORK: Rect = Rect::new(0, 0, 1920, 1032); // 48px taskbar at the bottom

    #[test]
    fn notch_is_top_centered() {
        let p = notch(MONITOR, 400, 60, 0.5);
        assert_eq!(p.window, Rect::new(760, 0, 400, 60));
        assert_eq!(p.anchor, 200);
    }

    #[test]
    fn notch_respects_second_monitor_offset() {
        let second = Rect::new(1920, -200, 2560, 1440);
        let p = notch(second, 400, 60, 0.5);
        assert_eq!((p.window.x, p.window.y), (1920 + 1080, -200));
    }

    #[test]
    fn near_the_edge_the_window_clamps_but_the_pill_keeps_going() {
        let p = notch(MONITOR, 400, 60, 0.05);
        assert_eq!(p.window.x, 0);
        assert_eq!(p.anchor, 96); // 5% of 1920
        let p = notch(MONITOR, 400, 60, 1.0);
        assert_eq!(p.window.right(), 1920);
        assert_eq!(p.window.x + p.anchor, 1920);
    }

    #[test]
    fn notch_offset_round_trips() {
        let second = Rect::new(1920, 0, 2560, 1440);
        let p = notch(second, 400, 60, 0.3);
        let offset = notch_offset(second, p.window.x + p.anchor);
        assert!((offset - 0.3).abs() < 0.001);
    }

    #[test]
    fn flyout_sits_above_bottom_taskbar_and_clamps_right() {
        let r = tray_flyout(WORK, (1900, 1060), 380, 520, 12);
        assert_eq!(r.right(), 1920 - 12);
        assert_eq!(r.bottom(), 1032 - 12);
    }

    #[test]
    fn flyout_sits_below_top_taskbar() {
        let work = Rect::new(0, 48, 1920, 1032);
        let r = tray_flyout(work, (900, 10), 380, 520, 12);
        assert_eq!(r.y, 60);
    }

    #[test]
    fn dock_hugs_chosen_edge() {
        assert_eq!(dock(WORK, true, 360).x, 1560);
        assert_eq!(dock(WORK, false, 360).x, 0);
        assert_eq!(dock(WORK, true, 360).h, 1032);
    }

    #[test]
    fn orb_saved_position_is_clamped_on_screen() {
        let r = orb(WORK, 80, Some((5000, -50)), 16);
        assert_eq!((r.x, r.y), (1840, 0));
    }

    #[test]
    fn beside_flips_right_when_no_room_on_left() {
        let anchor = Rect::new(10, 500, 80, 80);
        let r = beside(WORK, anchor, 380, 520, 12);
        assert_eq!(r.x, anchor.right() + 12);
    }

    #[test]
    fn oversized_window_does_not_panic() {
        let r = tray_flyout(Rect::new(0, 0, 300, 300), (10, 10), 500, 500, 12);
        assert_eq!(r.x, 12);
    }

    #[test]
    fn taskbar_widget_sits_in_the_bottom_strip() {
        let monitor = Rect::new(0, 0, 1920, 1080);
        let work = Rect::new(0, 0, 1920, 1032);
        assert_eq!(
            taskbar_widget(monitor, work, 260, 48, 8),
            Rect::new(8, 1032, 260, 48)
        );
    }

    #[test]
    fn taskbar_widget_handles_top_and_hidden_taskbars() {
        let monitor = Rect::new(1920, 0, 2560, 1440);
        let top = Rect::new(1920, 40, 2560, 1400);
        assert_eq!(
            taskbar_widget(monitor, top, 300, 48, 8),
            Rect::new(1928, 0, 300, 40)
        );
        // Auto-hide: the work area is the whole monitor.
        assert_eq!(
            taskbar_widget(monitor, monitor, 300, 48, 8),
            Rect::new(1928, 1392, 300, 48)
        );
    }

    #[test]
    fn panel_opens_above_the_widget() {
        let work = Rect::new(0, 0, 1920, 1032);
        let widget = Rect::new(8, 1032, 260, 48);
        assert_eq!(
            above_widget(work, widget, 400, 580, 12),
            Rect::new(12, 440, 400, 580)
        );
    }
}
