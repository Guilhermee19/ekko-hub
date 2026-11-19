import { useAssistant, type Activity } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'

/** How long quick alerts stay (Notch → Avisos rápidos, 1..10 s). */
export function alertMs(): number {
  const s = useSettings.getState().settings.notch.alertSeconds
  return Math.min(10, Math.max(1, s || 5)) * 1000
}

let timer: ReturnType<typeof setTimeout> | undefined
let current: Activity | null = null
/** What the flash replaced (an explicit activity), restored when it goes away. */
let underneath: Activity | null = null

/**
 * By value: presence is broadcast to every window (this one included), so the store
 * holds a copy of what we set, never the same object.
 */
const same = (a: Activity | null, b: Activity | null) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Shows `activity` in the pill for `ms` after the last change, then puts back what was
 * there before (volume, brightness, Caps Lock, battery… share this).
 */
export function flashActivity(activity: Activity, ms: number) {
  const assistant = useAssistant.getState()
  // A flash replacing a flash keeps the original "before".
  if (current === null || !same(assistant.activity, current)) underneath = assistant.activity
  current = activity
  assistant.set({ activity })
  clearTimeout(timer)
  timer = setTimeout(() => {
    const now = useAssistant.getState()
    if (same(now.activity, current)) now.set({ activity: underneath })
    current = null
    underneath = null
  }, ms)
}
