import type { Notification } from './store'

export interface DayGroup {
  label: 'Hoje' | 'Antes'
  items: Notification[]
}

function startOfDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Newest first, split into "Hoje" (local calendar day) and "Antes"; empty groups dropped. */
export function groupByDay(items: Notification[], now: number): DayGroup[] {
  const today = startOfDay(now)
  const sorted = [...items].sort((a, b) => b.at - a.at)
  const groups: DayGroup[] = [
    { label: 'Hoje', items: sorted.filter((n) => n.at >= today) },
    { label: 'Antes', items: sorted.filter((n) => n.at < today) },
  ]
  return groups.filter((g) => g.items.length > 0)
}

/** "14:05" for today, "ontem 14:05", or "12/11 14:05". */
export function formatWhen(at: number, now: number): string {
  const time = new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000)
  if (days <= 0) return time
  if (days === 1) return `ontem ${time}`
  const date = new Date(at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${date} ${time}`
}
