import { useState } from 'react'
import { CommandPalette } from '@/features/palette/CommandPalette'
import { backend } from '@/lib/ipc'
import { goToPage } from '../panel/navigate'
import { usePaletteOpen } from './usePaletteOpen'

/** Palette window (Ctrl+Alt+Space, or Alt+Shift+Space if taken): transparent, the box sits at the top. */
export function PaletteSurface() {
  // Each opening remounts the palette, so the query and selection start fresh.
  const [session, setSession] = useState(0)
  usePaletteOpen(() => setSession((n) => n + 1))
  return (
    <div className="flex h-full items-start justify-center p-3">
      <CommandPalette
        key={session}
        onClose={() => void backend.hideSelf()}
        onNavigate={(page) => {
          void backend.hideSelf()
          goToPage(page)
        }}
      />
    </div>
  )
}
