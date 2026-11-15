// Pure routine types and helpers (no React, no store) so they are easy to test.

export type Days = 'weekdays' | 'everyday' | 'weekend'

export type Trigger =
  | { kind: 'time'; time: string; days: Days }
  | { kind: 'phrase'; phrase: string }
  | { kind: 'event'; event: EventId }

export type TriggerKind = Trigger['kind']

export type EventId = 'pc-on' | 'unlock' | 'headphones' | 'idle'

export const EVENTS: Record<EventId, string> = {
  'pc-on': 'ao ligar o PC',
  unlock: 'ao desbloquear',
  headphones: 'ao conectar o fone',
  idle: 'ao ficar ausente',
}

export const DAYS: Record<Days, string> = {
  weekdays: 'seg–sex',
  everyday: 'todo dia',
  weekend: 'sáb–dom',
}

export const TRIGGER_KINDS: Record<TriggerKind, string> = {
  time: 'Horário',
  phrase: 'Frase',
  event: 'Evento',
}

/** Step of a routine; `catalogId` points into the action catalog. */
export interface RoutineStep {
  id: string
  catalogId: string
}

export interface Routine {
  id: string
  name: string
  trigger: Trigger
  steps: RoutineStep[]
  enabled: boolean
  lastRunAt: number | null
}

/** Default trigger when switching kinds in the editor. */
export function defaultTrigger(kind: TriggerKind): Trigger {
  if (kind === 'time') return { kind, time: '07:30', days: 'weekdays' }
  if (kind === 'phrase') return { kind, phrase: '' }
  return { kind, event: 'pc-on' }
}

/** Chip text: "07:30 · seg–sex", "“bom dia”", "ao ligar o PC". */
export function triggerLabel(t: Trigger): string {
  if (t.kind === 'time') return `${t.time} · ${DAYS[t.days]}`
  if (t.kind === 'phrase') return t.phrase.trim() ? `“${t.phrase.trim()}”` : 'Frase não definida'
  return EVENTS[t.event]
}

/** Returns a copy with the item at `from` moved to `to` (clamped); same array if no-op. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(list.length - 1, to))
  if (from < 0 || from >= list.length || from === target) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Nunca rodou", "hoje às 07:30", "ontem às 07:30", "12/11 às 07:30". */
export function formatLastRun(at: number | null, now: number): string {
  if (at === null) return 'Nunca rodou'
  const d = new Date(at)
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)
  if (at >= startOfToday) return `hoje às ${time}`
  if (at >= startOfToday - 86_400_000) return `ontem às ${time}`
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${time}`
}
