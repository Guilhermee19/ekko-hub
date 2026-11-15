// Deterministic mock telemetry: every value is a pure function of time, so components can
// derive it during render from `useNow` without storing samples. F2 swaps this for real data.

export type MetricKey = 'cpu' | 'ram' | 'gpu' | 'disk' | 'net' | 'temp'

interface MetricSpec {
  base: number
  /** Slow sine swing around `base`. */
  swing: number
  /** Per-sample jitter amplitude. */
  jitter: number
  /** Sine period in seconds. */
  period: number
  min: number
  max: number
}

export const METRIC_SPECS: Record<MetricKey, MetricSpec> = {
  cpu: { base: 34, swing: 12, jitter: 9, period: 47, min: 3, max: 100 },
  ram: { base: 68, swing: 4, jitter: 1.5, period: 120, min: 0, max: 100 },
  gpu: { base: 22, swing: 10, jitter: 6, period: 61, min: 0, max: 100 },
  disk: { base: 71, swing: 0.2, jitter: 0.05, period: 600, min: 0, max: 100 },
  net: { base: 4.2, swing: 2.8, jitter: 1.6, period: 29, min: 0.1, max: 100 },
  temp: { base: 58, swing: 6, jitter: 1.8, period: 83, min: 30, max: 100 },
}

const KEY_SEED: Record<MetricKey, number> = { cpu: 1, ram: 2, gpu: 3, disk: 4, net: 5, temp: 6 }

/** Hash-based noise in [-1, 1], stable for the same (seed, step). */
export function noise(seed: number, step: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(step, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d)
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b)
  h ^= h >>> 16
  return ((h >>> 0) / 0xffffffff) * 2 - 1
}

/** Metric value at whole second `sec` (epoch seconds), clamped to the spec range. */
export function metricAt(key: MetricKey, sec: number): number {
  const s = METRIC_SPECS[key]
  const phase = KEY_SEED[key] * 1.7
  const raw =
    s.base +
    s.swing * Math.sin((sec / s.period) * 2 * Math.PI + phase) +
    s.jitter * noise(KEY_SEED[key], sec)
  return Math.min(s.max, Math.max(s.min, raw))
}

/** Last `count` samples (oldest first) ending at `nowMs`, one per second. */
export function metricSeries(key: MetricKey, nowMs: number, count = 30): number[] {
  const end = Math.floor(nowMs / 1000)
  return Array.from({ length: count }, (_, i) => metricAt(key, end - count + 1 + i))
}

/** SVG polyline points for a series scaled into a `w`×`h` box with domain [lo, hi]. */
export function sparkPoints(
  values: number[],
  w: number,
  h: number,
  lo: number,
  hi: number,
): string {
  if (values.length === 0) return ''
  const span = hi - lo || 1
  const dx = values.length > 1 ? w / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const y = h - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * h
      return `${(i * dx).toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
