//! Turns the PC's audio output into a few bar heights (0..1) for the music
//! visualizer: one band-pass filter per bar, RMS per frame, a slowly decaying
//! peak per band as automatic gain (so low volume and quiet treble still move) and a fast-rise,
//! slow-fall envelope so the bars hit on the beat and settle smoothly.

/// Center frequencies (Hz): bass, low-mid, high-mid, treble.
pub const BANDS_HZ: [f32; 4] = [90.0, 500.0, 2_000.0, 7_000.0];

/// Below this RMS the band counts as silent (about -70 dBFS).
const SILENCE: f32 = 3e-4;
/// Per-frame decay of the auto-gain peak (~20 s to halve at 30 fps).
const PEAK_DECAY: f32 = 0.999;
/// Per-frame fall of a bar; the rise is instant.
const RELEASE: f32 = 0.78;
/// A band's gain never goes past this share of the loudest band, so a strong bass
/// leaking into its neighbors does not light every bar.
const SHARED_FLOOR: f32 = 0.3;

/// Band-pass biquad (RBJ cookbook, constant 0 dB peak gain).
#[derive(Debug, Clone)]
struct BandPass {
    b0: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BandPass {
    fn new(center_hz: f32, q: f32, sample_rate: f32) -> Self {
        let w0 = 2.0 * std::f32::consts::PI * center_hz.min(sample_rate * 0.45) / sample_rate;
        let alpha = w0.sin() / (2.0 * q);
        let a0 = 1.0 + alpha;
        Self {
            b0: alpha / a0,
            b2: -alpha / a0,
            a1: -2.0 * w0.cos() / a0,
            a2: (1.0 - alpha) / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    fn run(&mut self, x: f32) -> f32 {
        let y = self.b0 * x + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y;
        y
    }
}

#[derive(Debug, Clone)]
struct Band {
    filter: BandPass,
    energy: f64,
    peak: f32,
    level: f32,
}

/// Feed mono samples with `push`, read one frame of bar heights with `frame`.
#[derive(Debug, Clone)]
pub struct Spectrum {
    bands: Vec<Band>,
    samples: u32,
    /// Decaying peak of the loudest band.
    loudest: f32,
}

impl Spectrum {
    pub fn new(sample_rate: u32) -> Self {
        let rate = sample_rate.max(8_000) as f32;
        let bands = BANDS_HZ
            .iter()
            .map(|&hz| Band {
                filter: BandPass::new(hz, 1.2, rate),
                energy: 0.0,
                peak: SILENCE * 4.0,
                level: 0.0,
            })
            .collect();
        Self {
            bands,
            samples: 0,
            loudest: SILENCE,
        }
    }

    pub fn push(&mut self, mono: &[f32]) {
        for &x in mono {
            let x = if x.is_finite() { x } else { 0.0 };
            for band in &mut self.bands {
                let y = band.filter.run(x);
                band.energy += f64::from(y * y);
            }
        }
        self.samples = self.samples.saturating_add(mono.len() as u32);
    }

    /// Bar heights since the last call; an empty interval just lets the bars fall.
    pub fn frame(&mut self) -> Vec<f32> {
        let n = f64::from(self.samples.max(1));
        let had_audio = self.samples > 0;
        self.samples = 0;
        let rms: Vec<f32> = self
            .bands
            .iter_mut()
            .map(|band| {
                let rms = if had_audio {
                    (band.energy / n).sqrt() as f32
                } else {
                    0.0
                };
                band.energy = 0.0;
                rms
            })
            .collect();
        let loudest = rms.iter().copied().fold(0.0, f32::max);
        self.loudest = (self.loudest * PEAK_DECAY).max(loudest).max(SILENCE);
        let floor = self.loudest * SHARED_FLOOR;
        self.bands
            .iter_mut()
            .zip(rms)
            .map(|(band, rms)| {
                band.peak = (band.peak * PEAK_DECAY).max(rms).max(floor);
                let target = if rms < SILENCE {
                    0.0
                } else {
                    (rms / band.peak).min(1.0)
                };
                band.level = target.max(band.level * RELEASE);
                if band.level < 0.01 {
                    band.level = 0.0;
                }
                band.level
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RATE: u32 = 48_000;

    fn tone(hz: f32, amp: f32, ms: u32) -> Vec<f32> {
        let n = RATE * ms / 1000;
        (0..n)
            .map(|i| amp * (2.0 * std::f32::consts::PI * hz * i as f32 / RATE as f32).sin())
            .collect()
    }

    fn settle(s: &mut Spectrum, samples: &[f32]) -> Vec<f32> {
        let mut last = Vec::new();
        for chunk in samples.chunks(RATE as usize / 30) {
            s.push(chunk);
            last = s.frame();
        }
        last
    }

    #[test]
    fn silence_keeps_bars_down() {
        let mut s = Spectrum::new(RATE);
        assert_eq!(settle(&mut s, &vec![0.0; RATE as usize]), vec![0.0; 4]);
    }

    #[test]
    fn a_bass_tone_lights_the_bass_bar_most() {
        let mut s = Spectrum::new(RATE);
        let bars = settle(&mut s, &tone(90.0, 0.5, 600));
        assert!(bars[0] > 0.8, "{bars:?}");
        assert!(bars[3] < 0.3, "{bars:?}");
    }

    #[test]
    fn a_treble_tone_lights_the_treble_bar_most() {
        let mut s = Spectrum::new(RATE);
        let bars = settle(&mut s, &tone(7_000.0, 0.5, 600));
        assert!(bars[3] > 0.8, "{bars:?}");
        assert!(bars[0] < 0.3, "{bars:?}");
    }

    #[test]
    fn quiet_audio_still_moves_the_bars() {
        let mut s = Spectrum::new(RATE);
        let bars = settle(&mut s, &tone(500.0, 0.01, 600));
        assert!(bars[1] > 0.8, "{bars:?}");
    }

    #[test]
    fn bars_fall_when_the_sound_stops() {
        let mut s = Spectrum::new(RATE);
        settle(&mut s, &tone(90.0, 0.5, 300));
        let first = s.frame()[0];
        let mut later = first;
        for _ in 0..30 {
            later = s.frame()[0];
        }
        assert!(first > 0.0 && first < 1.0);
        assert_eq!(later, 0.0);
    }

    #[test]
    fn garbage_samples_do_not_poison_the_filters() {
        let mut s = Spectrum::new(RATE);
        s.push(&[f32::NAN, f32::INFINITY]);
        let bars = settle(&mut s, &tone(2_000.0, 0.5, 300));
        assert!(bars.iter().all(|b| b.is_finite()));
    }
}
