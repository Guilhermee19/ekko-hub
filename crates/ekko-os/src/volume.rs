//! Windows master volume (default playback device) via Core Audio. No login, any app.
//! Each call initializes COM on the calling thread and re-reads the default endpoint,
//! so it is safe from any worker thread and follows device switches (headset, HDMI).

use serde::Serialize;

/// Step used by "aumenta/abaixa o volume" (5%).
pub const STEP: f32 = 0.05;

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VolumeState {
    /// Master scalar, 0..1 (what the Windows flyout shows as 0..100).
    pub level: f32,
    pub muted: bool,
}

impl VolumeState {
    /// Worth telling the UI about (ignores float noise below half a percent).
    pub fn differs(&self, other: &Self) -> bool {
        self.muted != other.muted || (self.level - other.level).abs() >= 0.005
    }
}

#[derive(Debug, thiserror::Error)]
pub enum VolumeError {
    #[error("controle de volume indisponível neste sistema")]
    Unsupported,
    #[error("erro do sistema de áudio: {0}")]
    Os(String),
}

pub type Result<T> = std::result::Result<T, VolumeError>;

/// 0..1, NaN becomes 0.
pub fn clamp_level(level: f32) -> f32 {
    if level.is_nan() {
        0.0
    } else {
        level.clamp(0.0, 1.0)
    }
}

/// `current + delta`, snapped to whole percents so repeated steps stay on the grid.
pub fn stepped(current: f32, delta: f32) -> f32 {
    clamp_level(((current + delta) * 100.0).round() / 100.0)
}

pub fn get() -> Result<VolumeState> {
    imp::get()
}

/// Sets the master level; a level above zero also unmutes, like the Windows flyout.
pub fn set_level(level: f32) -> Result<VolumeState> {
    imp::set(clamp_level(level), None)
}

pub fn step(delta: f32) -> Result<VolumeState> {
    let now = get()?;
    imp::set(stepped(now.level, delta), None)
}

pub fn set_muted(muted: bool) -> Result<VolumeState> {
    let now = get()?;
    imp::set(now.level, Some(muted))
}

#[cfg(windows)]
mod imp {
    use windows::Win32::Media::Audio::Endpoints::IAudioEndpointVolume;
    use windows::Win32::Media::Audio::{
        IMMDeviceEnumerator, MMDeviceEnumerator, eConsole, eRender,
    };
    use windows::Win32::System::Com::{
        CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize,
    };

    use super::{Result, VolumeError, VolumeState};

    /// Balances a successful `CoInitializeEx`. A thread already in an STA reports
    /// `RPC_E_CHANGED_MODE`; Core Audio works there too, so we just don't uninit.
    struct Com(bool);

    impl Com {
        fn init() -> Self {
            Com(unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.is_ok())
        }
    }

    impl Drop for Com {
        fn drop(&mut self) {
            if self.0 {
                unsafe { CoUninitialize() };
            }
        }
    }

    fn os(err: windows::core::Error) -> VolumeError {
        VolumeError::Os(err.message())
    }

    /// Runs `job` on the default render endpoint; COM objects drop before uninit.
    fn with_endpoint<T>(
        job: impl FnOnce(&IAudioEndpointVolume) -> windows::core::Result<T>,
    ) -> Result<T> {
        let _com = Com::init();
        let run = || -> windows::core::Result<T> {
            let devices: IMMDeviceEnumerator =
                unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? };
            let device = unsafe { devices.GetDefaultAudioEndpoint(eRender, eConsole)? };
            let endpoint: IAudioEndpointVolume = unsafe { device.Activate(CLSCTX_ALL, None)? };
            job(&endpoint)
        };
        run().map_err(os)
    }

    fn read(endpoint: &IAudioEndpointVolume) -> windows::core::Result<VolumeState> {
        let level = unsafe { endpoint.GetMasterVolumeLevelScalar()? };
        let muted = unsafe { endpoint.GetMute()? }.as_bool();
        Ok(VolumeState { level, muted })
    }

    pub fn get() -> Result<VolumeState> {
        with_endpoint(read)
    }

    pub fn set(level: f32, muted: Option<bool>) -> Result<VolumeState> {
        with_endpoint(|endpoint| {
            unsafe { endpoint.SetMasterVolumeLevelScalar(level, std::ptr::null())? };
            let mute =
                muted.unwrap_or_else(|| level <= 0.0 && read(endpoint).is_ok_and(|s| s.muted));
            unsafe { endpoint.SetMute(mute, std::ptr::null())? };
            read(endpoint)
        })
    }
}

#[cfg(not(windows))]
mod imp {
    use super::{Result, VolumeError, VolumeState};

    pub fn get() -> Result<VolumeState> {
        Err(VolumeError::Unsupported)
    }

    pub fn set(_: f32, _: Option<bool>) -> Result<VolumeState> {
        Err(VolumeError::Unsupported)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamps_to_unit_range() {
        assert_eq!(clamp_level(1.4), 1.0);
        assert_eq!(clamp_level(-0.2), 0.0);
        assert_eq!(clamp_level(f32::NAN), 0.0);
        assert_eq!(clamp_level(0.42), 0.42);
    }

    #[test]
    fn steps_by_five_percent_on_the_grid() {
        assert!((stepped(0.50, STEP) - 0.55).abs() < 1e-6);
        assert!((stepped(0.50, -STEP) - 0.45).abs() < 1e-6);
        // Float noise from the OS (0.4999) still lands on whole percents.
        assert!((stepped(0.4999, STEP) - 0.55).abs() < 1e-6);
        assert_eq!(stepped(0.98, STEP), 1.0);
        assert_eq!(stepped(0.02, -STEP), 0.0);
    }

    #[test]
    fn differs_ignores_float_noise() {
        let a = VolumeState {
            level: 0.5,
            muted: false,
        };
        assert!(!a.differs(&VolumeState { level: 0.502, ..a }));
        assert!(a.differs(&VolumeState { level: 0.51, ..a }));
        assert!(a.differs(&VolumeState { muted: true, ..a }));
    }
}
