import type { DndSettings } from '@/lib/ipc/generalTypes'

// "Não perturbe" check in local time. Mirrors `DndSettings::is_active_at` (ekko-core).

/** "HH:MM" → minutes since midnight, or null when malformed. */
export function parseHhmm(text: string): number | null {
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(text.trim())
  if (!m) return null
  const [h, min] = [Number(m[1]), Number(m[2])]
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** True when quiet hours cover `now`; 22:00 → 07:00 crosses midnight, from == to is never. */
export function dndActive(dnd: DndSettings, now: Date = new Date()): boolean {
  if (!dnd.enabled) return false
  const from = parseHhmm(dnd.from)
  const to = parseHhmm(dnd.to)
  if (from === null || to === null) return false
  const minute = now.getHours() * 60 + now.getMinutes()
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to
}
