import { useEffect, useState } from 'react'

/** Re-renders every `ms` while `enabled`; returns Date.now(). */
export function useNow(enabled: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [enabled, ms])
  return now
}
