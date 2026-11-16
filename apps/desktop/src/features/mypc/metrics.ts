import type { HistoryPoint, KillReport, ProcessGroup, SortBy, SystemSnapshot } from '@/lib/ipc'

// Pure helpers for "Meu PC": formatting, history points, process filtering, scan progress.

export const HISTORY_LEN = 60

const nf = (v: number, digits: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: digits })

/** pt-BR binary size like Explorer: "640 MB", "1,8 GB". */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let v = Math.max(0, bytes)
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${nf(v, u >= 3 && v < 100 ? 1 : 0)} ${units[u]}`
}

/** Network speed in bits, the way providers sell it: "4,2 Mb/s". */
export function formatRate(bytesPerSec: number): string {
  const bits = bytesPerSec * 8
  if (bits >= 1e9) return `${nf(bits / 1e9, 1)} Gb/s`
  if (bits >= 1e6) return `${nf(bits / 1e6, 1)} Mb/s`
  return `${nf(bits / 1e3, 0)} Kb/s`
}

export function formatPercent(v: number): string {
  return `${nf(v, 0)}%`
}

/** "6 h 12 min" / "3 dias". */
export function formatUptime(secs: number): string {
  const days = Math.floor(secs / 86400)
  if (days >= 2) return `${days} dias`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export function systemDisk(s: SystemSnapshot) {
  return (
    s.disks.find((d) => d.mount.toUpperCase().startsWith('C:')) ?? s.disks.find((d) => !d.removable)
  )
}

/** Same shape the backend history uses (built here for live events). */
export function toPoint(s: SystemSnapshot): HistoryPoint {
  const disk = systemDisk(s)
  return {
    atMs: s.atMs,
    cpu: s.cpu.total,
    ram: s.memory.total ? (s.memory.used / s.memory.total) * 100 : 0,
    gpu: s.gpu?.usage ?? null,
    disk: disk && disk.total ? ((disk.total - disk.available) / disk.total) * 100 : null,
    net: s.network.rxPerSec + s.network.txPerSec,
    temp: s.temperature,
  }
}

/** Appends keeping the last `HISTORY_LEN` (ignores a repeated timestamp). */
export function appendPoint(history: HistoryPoint[], p: HistoryPoint): HistoryPoint[] {
  if (history.at(-1)?.atMs === p.atMs) return history
  return [...history, p].slice(-HISTORY_LEN)
}

/** Search by friendly or exe name, then sort. */
export function filterSort(groups: ProcessGroup[], query: string, by: SortBy): ProcessGroup[] {
  const q = query.trim().toLowerCase()
  const hits = q
    ? groups.filter((g) => g.label.toLowerCase().includes(q) || g.name.toLowerCase().includes(q))
    : groups
  return [...hits].sort((a, b) =>
    by === 'name'
      ? a.label.localeCompare(b.label, 'pt-BR')
      : by === 'cpu'
        ? b.cpu - a.cpu
        : b.memory - a.memory,
  )
}

/** Toast text after "Finalizar tarefa". */
export function killMessage(label: string, r: KillReport): string {
  if (r.failed === 0) return `${label} finalizado`
  if (r.ended === 0) {
    const why = r.results.find((x) => x.error)?.error
    return `Não consegui finalizar ${label}${why ? `: ${why}` : ''}`
  }
  return `${label}: ${r.ended} processo(s) finalizado(s), ${r.failed} não`
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
