import { useEffect } from 'react'
import { backend } from '@/lib/ipc'
import { useLatest } from '../shared/useOverlay'

/** Runs `cb` every time the palette window is shown again. */
export function usePaletteOpen(cb: () => void) {
  const ref = useLatest(cb)
  useEffect(() => {
    const off = backend.onPaletteOpen(() => ref.current())
    return () => void off.then((f) => f())
  }, [ref])
}
