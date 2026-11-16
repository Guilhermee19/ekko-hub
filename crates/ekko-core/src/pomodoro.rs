//! Pomodoro: focus/break cycle. When a phase ends it advances to the next one, idle.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PomodoroPhase {
    #[default]
    Focus,
    Break,
}

impl PomodoroPhase {
    pub fn label(self) -> &'static str {
        match self {
            Self::Focus => "Foco",
            Self::Break => "Pausa",
        }
    }

    fn next(self) -> Self {
        match self {
            Self::Focus => Self::Break,
            Self::Break => Self::Focus,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PomodoroAction {
    Start,
    Pause,
    Skip,
    Reset,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pomodoro {
    pub phase: PomodoroPhase,
    /// Epoch ms while running.
    pub ends_at_ms: Option<u64>,
    /// Ms left while paused.
    pub paused_left_ms: Option<u64>,
    /// Finished focus blocks.
    pub cycles: u32,
    pub focus_min: u32,
    pub break_min: u32,
    /// Start the next phase right away when one ends.
    pub auto_advance: bool,
}

impl Default for Pomodoro {
    fn default() -> Self {
        Self {
            phase: PomodoroPhase::Focus,
            ends_at_ms: None,
            paused_left_ms: None,
            cycles: 0,
            focus_min: 25,
            break_min: 5,
            auto_advance: false,
        }
    }
}

impl Pomodoro {
    pub fn phase_ms(&self) -> u64 {
        let min = match self.phase {
            PomodoroPhase::Focus => self.focus_min,
            PomodoroPhase::Break => self.break_min,
        };
        u64::from(min) * 60_000
    }

    pub fn is_running(&self) -> bool {
        self.ends_at_ms.is_some()
    }

    /// Applies a user action; false when it changed nothing.
    pub fn apply(&mut self, action: PomodoroAction, now: u64) -> bool {
        match action {
            PomodoroAction::Start => {
                if self.is_running() {
                    return false;
                }
                let left = self
                    .paused_left_ms
                    .take()
                    .unwrap_or_else(|| self.phase_ms());
                self.ends_at_ms = Some(now + left);
            }
            PomodoroAction::Pause => {
                let Some(end) = self.ends_at_ms.take() else {
                    return false;
                };
                self.paused_left_ms = Some(end.saturating_sub(now));
            }
            PomodoroAction::Skip => self.advance(now, false),
            PomodoroAction::Reset => {
                self.phase = PomodoroPhase::Focus;
                self.ends_at_ms = None;
                self.paused_left_ms = None;
            }
        }
        true
    }

    fn advance(&mut self, now: u64, auto: bool) {
        if self.phase == PomodoroPhase::Focus {
            self.cycles += 1;
        }
        self.phase = self.phase.next();
        self.paused_left_ms = None;
        self.ends_at_ms = auto.then(|| now + self.phase_ms());
    }

    /// If the running phase reached zero, advances and returns the phase that ended.
    pub fn due(&mut self, now: u64) -> Option<PomodoroPhase> {
        let end = self.ends_at_ms?;
        if end > now {
            return None;
        }
        let ended = self.phase;
        self.advance(now, self.auto_advance);
        Some(ended)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const T0: u64 = 5_000_000;

    #[test]
    fn start_pause_resume() {
        let mut p = Pomodoro::default();
        assert!(p.apply(PomodoroAction::Start, T0));
        assert!(!p.apply(PomodoroAction::Start, T0));
        assert_eq!(p.ends_at_ms, Some(T0 + 25 * 60_000));
        p.apply(PomodoroAction::Pause, T0 + 60_000);
        assert_eq!(p.paused_left_ms, Some(24 * 60_000));
        p.apply(PomodoroAction::Start, T0 + 600_000);
        assert_eq!(p.ends_at_ms, Some(T0 + 600_000 + 24 * 60_000));
    }

    #[test]
    fn due_advances_to_idle_break_and_counts_the_cycle() {
        let mut p = Pomodoro::default();
        p.apply(PomodoroAction::Start, T0);
        assert_eq!(p.due(T0 + 1), None);
        assert_eq!(p.due(T0 + 25 * 60_000), Some(PomodoroPhase::Focus));
        assert_eq!(p.phase, PomodoroPhase::Break);
        assert_eq!(p.cycles, 1);
        assert!(!p.is_running());
        assert_eq!(p.due(T0 + 99 * 60_000), None);
    }

    #[test]
    fn auto_advance_starts_the_next_phase() {
        let mut p = Pomodoro {
            auto_advance: true,
            ..Pomodoro::default()
        };
        p.apply(PomodoroAction::Start, T0);
        let end = T0 + 25 * 60_000;
        p.due(end);
        assert_eq!(p.ends_at_ms, Some(end + 5 * 60_000));
    }

    #[test]
    fn skip_and_reset() {
        let mut p = Pomodoro::default();
        p.apply(PomodoroAction::Skip, T0);
        assert_eq!((p.phase, p.cycles), (PomodoroPhase::Break, 1));
        p.apply(PomodoroAction::Start, T0);
        p.apply(PomodoroAction::Reset, T0);
        assert_eq!(p.phase, PomodoroPhase::Focus);
        assert!(!p.is_running());
        assert_eq!(p.cycles, 1);
    }
}
