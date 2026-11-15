// Pure date helpers for task due labels ("hoje 15:00", "atrasada").

const DAY = 86_400_000

export function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Epoch ms for the day of `now` at hh:mm, optionally shifted by whole days. */
export function dayAt(now: number, h: number, m = 0, dayOffset = 0): number {
  const d = new Date(now)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** End-of-day marker: due "today" with no specific time. */
export function endOfDay(now: number): number {
  return dayAt(now, 23, 59)
}

export function isEndOfDay(t: number): boolean {
  const d = new Date(t)
  return d.getHours() === 23 && d.getMinutes() === 59
}

/** Due today or already overdue. */
export function isDueToday(due: number | undefined, now: number): boolean {
  return due !== undefined && due < dayAt(now, 0, 0, 1)
}

export function formatClock(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Short pt-BR label for a future date ("hoje 15:00", "amanhã", "qua 08:00", "25/11"). */
export function formatWhen(t: number, now: number): string {
  const days = Math.round((startOfDay(t) - startOfDay(now)) / DAY)
  const time = isEndOfDay(t) ? '' : ` ${formatClock(t)}`
  if (days === 0) return `hoje${time}`
  if (days === 1) return `amanhã${time}`
  if (days > 1 && days < 7) return `${WEEKDAYS[new Date(t).getDay()]}${time}`
  const d = new Date(t)
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Due label and whether it is overdue. */
export function formatDue(due: number, now: number): { text: string; overdue: boolean } {
  if (due < now) return { text: 'atrasada', overdue: true }
  return { text: formatWhen(due, now), overdue: false }
}
