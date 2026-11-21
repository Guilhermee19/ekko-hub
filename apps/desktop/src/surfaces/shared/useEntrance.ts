import { useEffect, type RefObject } from 'react'

const POP: Keyframe[] = [
  { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
  { opacity: 1, transform: 'none' },
]
const OUT: Keyframe[] = [
  { opacity: 1, transform: 'none' },
  { opacity: 0, transform: 'translateY(-6px) scale(0.97)' },
]
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

function reduced(): boolean {
  const pref = document.documentElement.dataset.reduceMotion
  if (pref === 'on') return true
  if (pref === 'off') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Plays a soft "pop" on `ref` when it mounts and every time its window comes back
 *  (popover windows are hidden and shown, never rebuilt). */
export function useEntrance(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const play = () => {
      const el = ref.current
      if (!el?.animate) return
      // The last exit holds the box invisible (fill: forwards) until it is cancelled.
      el.getAnimations().forEach((x) => x.cancel())
      if (!reduced()) el.animate(POP, { duration: 260, easing: EASE })
    }
    play()
    window.addEventListener('focus', play)
    return () => window.removeEventListener('focus', play)
  }, [ref])
}

/** Fades `el` out, then runs `done` (e.g. hide the window). */
export function playExit(el: HTMLElement | null, done: () => void) {
  if (!el?.animate || reduced()) return done()
  el.animate(OUT, { duration: 150, easing: 'ease-in', fill: 'forwards' }).finished.then(done, done)
}
