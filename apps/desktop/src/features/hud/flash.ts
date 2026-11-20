import { useAssistant, type Activity } from '@/stores/assistant'
import { alertMs } from '@/stores/settings'

let timer: ReturnType<typeof setTimeout> | undefined
/** What the flash replaced (never another flash), restored when it goes away. */
let underneath: Activity | null = null
let watching = false

/** Quick reactions (Caps Lock, mic, brightness, battery, volume): they always leave. */
const isFlash = (a: Activity | null) => a?.kind === 'hud' || a?.kind === 'volume'

/**
 * Shows `activity` in the pill for `ms` after the last change, then puts back what was
 * there before (volume, brightness, Caps Lock, battery… share this).
 */
export function flashActivity(activity: Activity, ms: number) {
  watchFlashes()
  const assistant = useAssistant.getState()
  // Another flash (ours or another window's) is never something to go back to.
  if (!isFlash(assistant.activity)) underneath = assistant.activity
  expireIn(ms)
  assistant.set({ activity })
}

function expireIn(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    timer = undefined
    const now = useAssistant.getState()
    // By kind, not by value: presence is broadcast, so the store may hold a late echo
    // or another window's flash instead of exactly what we set.
    if (isFlash(now.activity)) now.set({ activity: underneath })
    underneath = null
  }, ms)
}

/**
 * Safety net for the windows with a pill: a flash that shows up with no timer running
 * here (late echo, another window) still leaves after the configured time.
 */
export function watchFlashes() {
  if (watching) return
  watching = true
  useAssistant.subscribe((s) => {
    if (isFlash(s.activity) && timer === undefined) expireIn(alertMs())
  })
}
