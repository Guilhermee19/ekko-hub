// Pure key-combo helpers for the shortcut editor. Combos are stored canonical
// ("Ctrl+Shift+Space") and only translated to pt-BR for display.

import { DEFAULT_SHORTCUT_SETTINGS, type ShortcutAction } from '@/lib/ipc/generalTypes'

export type ShortcutId = ShortcutAction

/** Same defaults as `ShortcutSettings::default()` (ekko-core). */
export const DEFAULT_SHORTCUTS: Record<ShortcutId, string> = DEFAULT_SHORTCUT_SETTINGS

/** The subset of KeyboardEvent the helpers need (easy to fake in tests). */
export interface KeyLike {
  key: string
  /** Physical key; keeps Shift+1 as "1" instead of "!". */
  code?: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'OS'])

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  Escape: 'Esc',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

/** Canonical combo for a key press, or null while only modifiers are held. */
export function comboFromKey(e: KeyLike): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null
  const physical = /^(?:Key|Digit)([A-Z0-9])$/.exec(e.code ?? '')?.[1]
  const key = physical ?? KEY_NAMES[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey) parts.push('Win')
  return [...parts, key].join('+')
}

const DISPLAY: Record<string, string> = {
  Space: 'Espaço',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→',
}

/** Keys of a combo as shown to the user, one per <Kbd>. */
export function comboKeys(combo: string): string[] {
  return combo
    .split('+')
    .filter(Boolean)
    .map((k) => DISPLAY[k] ?? k)
}

/** Ids whose combo is also used by another id (case-insensitive). */
export function findConflicts<T extends string>(map: Record<T, string>): Set<T> {
  const byCombo = new Map<string, T[]>()
  for (const id of Object.keys(map) as T[]) {
    const combo = map[id].toLowerCase()
    byCombo.set(combo, [...(byCombo.get(combo) ?? []), id])
  }
  const out = new Set<T>()
  for (const ids of byCombo.values()) if (ids.length > 1) ids.forEach((id) => out.add(id))
  return out
}
