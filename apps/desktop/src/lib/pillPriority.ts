import type { PillItem, PillShow } from './ipc'

/**
 * Which live activity the collapsed pill shows: the first one in the user's priority
 * that is both happening now and enabled in "Pílula". Null = resting look.
 */
export function pickPillItem(
  active: readonly PillItem[],
  show: PillShow,
  priority: readonly PillItem[],
): PillItem | null {
  return priority.find((item) => show[item] && active.includes(item)) ?? null
}

/** Moves `item` one step (-1 up, +1 down) in the priority list. */
export function movePillItem(priority: readonly PillItem[], item: PillItem, step: -1 | 1) {
  const from = priority.indexOf(item)
  const to = from + step
  if (from < 0 || to < 0 || to >= priority.length) return [...priority]
  const next = [...priority]
  ;[next[from], next[to]] = [next[to], next[from]]
  return next
}

/** Drag-and-drop: puts `item` where `target` is. */
export function dropPillItem(priority: readonly PillItem[], item: PillItem, target: PillItem) {
  const rest = priority.filter((p) => p !== item)
  const at = priority.indexOf(target)
  rest.splice(at, 0, item)
  return rest
}
