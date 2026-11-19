import { useEffect, useState } from 'react'
import { backend } from '@/lib/ipc'

/** Live visualizer bars (0..1, bass first) while `active`; null otherwise. */
export function useAudioLevels(active: boolean) {
  const [levels, setLevels] = useState<number[] | null>(null)
  useEffect(() => {
    if (!active) return
    const off = backend.onAudioLevels(setLevels)
    return () => void off.then((f) => f())
  }, [active])
  return active ? levels : null
}
