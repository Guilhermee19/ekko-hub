//! What the PC is playing, as samples: WASAPI loopback on the default playback device.
//! Feeds the music visualizer; nothing is recorded or stored. `capture` blocks and
//! hands mono samples to `on_tick` about every 10 ms (empty when nothing plays, since
//! loopback delivers no packets during silence) until the callback says stop.

use std::ops::ControlFlow;

#[derive(Debug, thiserror::Error)]
pub enum LoopbackError {
    #[error("o Windows recusou a captura do som: {0}")]
    Os(String),
    #[error("formato de áudio não suportado")]
    Format,
    #[error("o dispositivo de som padrão mudou")]
    DeviceChanged,
    #[error("captura de som só funciona no Windows")]
    Unsupported,
}

/// Runs until `on_tick` breaks (Ok) or the device fails or changes (Err; open again).
/// `on_tick(samples, sample_rate)`.
pub fn capture(
    on_tick: &mut dyn FnMut(&[f32], u32) -> ControlFlow<()>,
) -> Result<(), LoopbackError> {
    #[cfg(windows)]
    {
        win::capture(on_tick)
    }
    #[cfg(not(windows))]
    {
        let _ = on_tick;
        Err(LoopbackError::Unsupported)
    }
}

/// Interleaved frames → mono average. `None` for formats we do not read.
fn to_mono(
    bytes: &[u8],
    channels: usize,
    float: bool,
    bits: u16,
    out: &mut Vec<f32>,
) -> Option<()> {
    let width = match (float, bits) {
        (true, 32) | (false, 32) => 4,
        (false, 16) => 2,
        _ => return None,
    };
    let channels = channels.max(1);
    for frame in bytes.chunks_exact(width * channels) {
        let sum: f32 = frame
            .chunks_exact(width)
            .map(|s| match (float, width) {
                (true, _) => f32::from_le_bytes([s[0], s[1], s[2], s[3]]),
                (false, 4) => i32::from_le_bytes([s[0], s[1], s[2], s[3]]) as f32 / i32::MAX as f32,
                _ => f32::from(i16::from_le_bytes([s[0], s[1]])) / f32::from(i16::MAX),
            })
            .sum();
        out.push(sum / channels as f32);
    }
    Some(())
}

#[cfg(windows)]
mod win {
    use std::ops::ControlFlow;
    use std::thread;
    use std::time::{Duration, Instant};

    use windows::Win32::Media::Audio::{
        AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK,
        IAudioCaptureClient, IAudioClient, IMMDevice, IMMDeviceEnumerator, MMDeviceEnumerator,
        WAVEFORMATEX, WAVEFORMATEXTENSIBLE, eConsole, eRender,
    };
    use windows::Win32::System::Com::{
        CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoTaskMemFree,
        CoUninitialize,
    };

    use super::{LoopbackError, to_mono};

    const TICK: Duration = Duration::from_millis(10);
    const CHECK_DEVICE: Duration = Duration::from_secs(2);
    /// 200 ms shared-mode buffer, in 100 ns units.
    const BUFFER: i64 = 2_000_000;
    const WAVE_FORMAT_IEEE_FLOAT: u16 = 3;
    const WAVE_FORMAT_EXTENSIBLE: u16 = 0xFFFE;

    fn os(err: windows::core::Error) -> LoopbackError {
        LoopbackError::Os(err.message())
    }

    struct Com(bool);
    impl Drop for Com {
        fn drop(&mut self) {
            if self.0 {
                // SAFETY: balances the successful CoInitializeEx below.
                unsafe { CoUninitialize() };
            }
        }
    }

    /// The mix format; freed on drop.
    struct Format(*mut WAVEFORMATEX);
    impl Drop for Format {
        fn drop(&mut self) {
            // SAFETY: allocated by GetMixFormat with the COM allocator.
            unsafe { CoTaskMemFree(Some(self.0.cast_const().cast())) };
        }
    }

    /// (is float, bits per sample, channels, rate) of the mix format.
    unsafe fn describe(fmt: *const WAVEFORMATEX) -> (bool, u16, usize, u32) {
        // SAFETY: GetMixFormat returns a valid header; the extensible tail is only read
        // when the tag says it is there.
        unsafe {
            let head = std::ptr::read_unaligned(fmt);
            let float = match head.wFormatTag {
                WAVE_FORMAT_IEEE_FLOAT => true,
                WAVE_FORMAT_EXTENSIBLE if head.cbSize >= 22 => {
                    let ext = std::ptr::read_unaligned(fmt.cast::<WAVEFORMATEXTENSIBLE>());
                    // KSDATAFORMAT_SUBTYPE_IEEE_FLOAT starts with 0x00000003.
                    ext.SubFormat.data1 == 3
                }
                _ => false,
            };
            (
                float,
                head.wBitsPerSample,
                usize::from(head.nChannels),
                head.nSamplesPerSec,
            )
        }
    }

    fn device_id(device: &IMMDevice) -> Option<String> {
        // SAFETY: the returned string is owned by us and freed after copying.
        unsafe {
            let id = device.GetId().ok()?;
            let text = id.to_string().ok();
            CoTaskMemFree(Some(id.0.cast_const().cast()));
            text
        }
    }

    pub fn capture(
        on_tick: &mut dyn FnMut(&[f32], u32) -> ControlFlow<()>,
    ) -> Result<(), LoopbackError> {
        // SAFETY: plain COM setup on this worker thread; every object drops before uninit.
        let _com = Com(unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) }.is_ok());
        // SAFETY: Core Audio calls with owned interfaces and checked results.
        unsafe {
            let devices: IMMDeviceEnumerator =
                CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL).map_err(os)?;
            let device = devices
                .GetDefaultAudioEndpoint(eRender, eConsole)
                .map_err(os)?;
            let id = device_id(&device);
            let client: IAudioClient = device.Activate(CLSCTX_ALL, None).map_err(os)?;
            let format = Format(client.GetMixFormat().map_err(os)?);
            let (float, bits, channels, rate) = describe(format.0);
            let frame_bytes = usize::from(bits / 8) * channels;
            if frame_bytes == 0 || to_mono(&[], channels, float, bits, &mut Vec::new()).is_none() {
                return Err(LoopbackError::Format);
            }
            client
                .Initialize(
                    AUDCLNT_SHAREMODE_SHARED,
                    AUDCLNT_STREAMFLAGS_LOOPBACK,
                    BUFFER,
                    0,
                    format.0,
                    None,
                )
                .map_err(os)?;
            let reader: IAudioCaptureClient = client.GetService().map_err(os)?;
            client.Start().map_err(os)?;
            let result = pump(
                &reader,
                &devices,
                id,
                (float, bits, channels, rate),
                on_tick,
            );
            let _ = client.Stop();
            result
        }
    }

    unsafe fn pump(
        reader: &IAudioCaptureClient,
        devices: &IMMDeviceEnumerator,
        id: Option<String>,
        (float, bits, channels, rate): (bool, u16, usize, u32),
        on_tick: &mut dyn FnMut(&[f32], u32) -> ControlFlow<()>,
    ) -> Result<(), LoopbackError> {
        let frame_bytes = usize::from(bits / 8) * channels;
        let mut mono = Vec::with_capacity(4096);
        let mut checked = Instant::now();
        loop {
            thread::sleep(TICK);
            mono.clear();
            // SAFETY: each GetBuffer is paired with ReleaseBuffer; the slice stays
            // inside the frames the device reported.
            unsafe {
                while reader.GetNextPacketSize().map_err(os)? > 0 {
                    let mut data = std::ptr::null_mut();
                    let mut frames = 0u32;
                    let mut flags = 0u32;
                    reader
                        .GetBuffer(&mut data, &mut frames, &mut flags, None, None)
                        .map_err(os)?;
                    let silent = flags & (AUDCLNT_BUFFERFLAGS_SILENT.0 as u32) != 0;
                    if silent || data.is_null() {
                        mono.resize(mono.len() + frames as usize, 0.0);
                    } else {
                        let bytes = std::slice::from_raw_parts(data, frames as usize * frame_bytes);
                        to_mono(bytes, channels, float, bits, &mut mono);
                    }
                    reader.ReleaseBuffer(frames).map_err(os)?;
                }
            }
            if on_tick(&mono, rate).is_break() {
                return Ok(());
            }
            if checked.elapsed() >= CHECK_DEVICE {
                checked = Instant::now();
                // SAFETY: plain query.
                let now = unsafe { devices.GetDefaultAudioEndpoint(eRender, eConsole) }
                    .ok()
                    .and_then(|d| device_id(&d));
                if now != id {
                    return Err(LoopbackError::DeviceChanged);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::to_mono;

    #[test]
    fn stereo_float_is_averaged() {
        let bytes: Vec<u8> = [0.5f32, -0.5, 1.0, 0.0]
            .iter()
            .flat_map(|f| f.to_le_bytes())
            .collect();
        let mut out = Vec::new();
        to_mono(&bytes, 2, true, 32, &mut out).unwrap();
        assert_eq!(out, vec![0.0, 0.5]);
    }

    #[test]
    fn pcm16_is_scaled_and_odd_formats_rejected() {
        let bytes: Vec<u8> = [i16::MAX, 0].iter().flat_map(|s| s.to_le_bytes()).collect();
        let mut out = Vec::new();
        to_mono(&bytes, 1, false, 16, &mut out).unwrap();
        assert_eq!(out, vec![1.0, 0.0]);
        assert!(to_mono(&[], 2, false, 24, &mut out).is_none());
    }
}
