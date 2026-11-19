import { useEffect, useState } from 'react'
import { backend } from '@/lib/ipc'
import { useShelf } from '@/features/shelf/store'

/**
 * True while files from Explorer (or any app) are dragged over the notch; dropping
 * them puts them on the shelf. Our own drag out passing over the notch is ignored.
 */
export function useFileDrop(): boolean {
  const [over, setOver] = useState(false)
  useEffect(() => {
    const off = backend.onFileDrop((e) => {
      if (useShelf.getState().draggingOut) return
      if (e.type === 'leave') return setOver(false)
      // Text or links dragged from a browser carry no paths: not for the shelf.
      if (e.type === 'enter' && e.paths.length === 0 && backend.kind === 'tauri') return
      if (e.type === 'enter') return setOver(true)
      setOver(false)
      useShelf.getState().add(e.paths)
    })
    return () => void off.then((f) => f())
  }, [])
  return over
}
