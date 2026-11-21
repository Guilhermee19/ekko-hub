import { useEffect, useRef, useState } from 'react'
import { CommandPalette } from '@/features/palette/CommandPalette'
import { backend } from '@/lib/ipc'
import { goToPage } from '../panel/navigate'
import { playExit, useEntrance } from '../shared/useEntrance'
import { usePaletteOpen } from './usePaletteOpen'

/** Palette window (Ctrl+Alt+Space, or Alt+Shift+Space if taken): transparent, the box sits
 *  at the top. It pops in on every opening and fades out on the way out. */
export function PaletteSurface() {
  // Each opening remounts the palette, so the query and selection start fresh.
  const [session, setSession] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  usePaletteOpen(() => setSession((n) => n + 1))
  useEntrance(box)

  const close = (then?: () => void) =>
    playExit(box.current, () => {
      void backend.hideSelf()
      then?.()
    })

  // Hidden on blur by the backend: drop the old content so it never flashes next time.
  useEffect(() => {
    const reset = () => setSession((n) => n + 1)
    window.addEventListener('blur', reset)
    return () => window.removeEventListener('blur', reset)
  }, [])

  return (
    <div className="flex h-full items-start justify-center p-3">
      <div ref={box} className="flex max-h-full w-full max-w-[640px]">
        <CommandPalette
          key={session}
          onClose={() => close()}
          onNavigate={(page) => close(() => goToPage(page))}
        />
      </div>
    </div>
  )
}
