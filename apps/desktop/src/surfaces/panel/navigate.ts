import { useEffect } from 'react'
import { backend } from '@/lib/ipc'
import { useLatest } from '../shared/useOverlay'
import type { PageId } from './nav'

const NAVIGATE_EVENT = 'ekko://panel/navigate'

/** Opens Ekko on a given page from any window (palette, notifications…). */
export function goToPage(page: PageId) {
  void backend.broadcast(NAVIGATE_EVENT, page)
  void backend.summon()
}

/** Panel side: follow navigation requests from other windows. */
export function useNavigateRequests(cb: (page: PageId) => void) {
  const ref = useLatest(cb)
  useEffect(() => {
    const off = backend.listen<PageId>(NAVIGATE_EVENT, (p) => ref.current(p))
    return () => void off.then((f) => f())
  }, [ref])
}
