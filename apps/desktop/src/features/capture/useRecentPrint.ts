import { useEffect, useRef, useState } from 'react'
import { useShelf } from '@/features/shelf/store'
import { backend, type CaptureSaved } from '@/lib/ipc'

/** How long the "print salvo" card stays when nobody touches it. */
const SHOW_MS = 7000

/**
 * The print just saved, while its card is on the notch. Hovering keeps it there;
 * leaving restarts the countdown. Closing it (or the countdown running out) also
 * takes it off the shelf: it was a quick print, the PNG stays in Imagens\Ekko.
 */
export function useRecentPrint() {
  const [print, setPrint] = useState<CaptureSaved | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const current = useRef<CaptureSaved | null>(null)

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const clear = () => {
    stop()
    const id = current.current?.id
    // Still on the shelf? (dragging it out in "mover" mode already took it off).
    if (id && useShelf.getState().items.some((i) => i.id === id)) useShelf.getState().remove(id)
    current.current = null
    setPrint(null)
  }
  const countdown = () => {
    stop()
    timer.current = setTimeout(clear, SHOW_MS)
  }
  const countdownRef = useRef(countdown)
  useEffect(() => {
    countdownRef.current = countdown
  })

  useEffect(() => {
    const off = backend.onCaptureSaved((saved) => {
      current.current = saved
      setPrint(saved)
      countdownRef.current()
    })
    return () => {
      void off.then((f) => f())
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return {
    print,
    dismiss: clear,
    /** Pointer over the card: pause; out: count again. */
    hold: (inside: boolean) => (inside ? stop() : print && countdown()),
  }
}
