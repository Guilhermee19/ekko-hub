// Pure formatting/math for timers, stopwatch and pomodoro.

const pad = (n: number) => String(n).padStart(2, '0')

/** Stopwatch reading: "mm:ss.d", or "h:mm:ss.d" past one hour. */
export function formatElapsed(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 100))
  const tenths = t % 10
  const s = Math.floor(t / 10) % 60
  const m = Math.floor(t / 600) % 60
  const h = Math.floor(t / 36_000)
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}.${tenths}` : `${pad(m)}:${pad(s)}.${tenths}`
}

/** Human duration from seconds: "45 s", "5 min", "1 h 30 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

/** Ms left for a countdown, clamped to [0, total]. `pausedLeft` wins when set. */
export function remainingMs(
  endsAt: number,
  totalSec: number,
  now: number,
  pausedLeft?: number | null,
): number {
  const left = pausedLeft ?? endsAt - now
  return Math.min(totalSec * 1000, Math.max(0, left))
}

/** Elapsed fraction 0..1 of a countdown. */
export function elapsedFraction(leftMs: number, totalSec: number): number {
  return totalSec <= 0 ? 1 : 1 - leftMs / (totalSec * 1000)
}
