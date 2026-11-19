/** True when animations should be skipped (Ekko's setting, else the Windows one). */
export function reducedMotion(): boolean {
  const mode = document.documentElement.dataset.reduceMotion
  if (mode === 'on') return true
  if (mode === 'off') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
