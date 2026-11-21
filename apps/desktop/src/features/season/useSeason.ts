import { useEffect, useState } from 'react'
import { useSettings } from '@/stores/settings'
import { seasonOf, type Season } from './season'

/** Today's holiday look, or null when off (setting) or on an ordinary day. Rechecked
 *  every 30 min, so it switches on its own at midnight. */
export function useSeason(): Season | null {
  const on = useSettings((s) => s.settings.appearance.seasonal)
  const [today, setToday] = useState(() => seasonOf(new Date()))
  useEffect(() => {
    const id = window.setInterval(() => setToday(seasonOf(new Date())), 30 * 60_000)
    return () => window.clearInterval(id)
  }, [])
  return on ? today : null
}
