import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'
import { useSeason } from '@/features/season/useSeason'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { PanelShell } from '../panel/PanelShell'
import { useSystemHud } from '@/features/hud/useSystemHud'
import { EkkoBar } from '../shared/EkkoBar'
import { useEscape, useHitRect, useOverlayHover, useSummon } from '../shared/useOverlay'
import { useElementSize } from '../shared/useViewport'

const TAB = { w: 34, h: 96 }

/**
 * Edge dock: a small tab glued to the screen edge; hovering slides the panel out.
 * Window is a transparent full-height strip, so only the tab/panel take the mouse.
 */
export function DockSurface() {
  const { ref, w: width, h: height } = useElementSize<HTMLDivElement>()
  const right = useSettings((s) => s.settings.dockSide === 'right')
  const phase = useAssistant((s) => s.phase)
  const { hovered, bind } = useOverlayHover({ enterDelay: 120 })
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned
  const season = useSeason()

  const tabY = Math.round((height - TAB.h) / 2)
  useHitRect(
    open
      ? { x: 0, y: 0, w: width, h: height }
      : { x: right ? width - TAB.w : 0, y: tabY, w: TAB.w, h: TAB.h },
  )
  useSummon(() => setPinned((p) => !p))
  useSystemHud()
  useEscape(() => setPinned(false))

  return (
    <div ref={ref} {...bind} className="no-select relative h-full w-full overflow-hidden">
      <div
        style={{ top: tabY, height: TAB.h, width: TAB.w }}
        data-season={season ?? undefined}
        className={cn(
          'ekko-glow absolute grid place-items-center transition-opacity',
          right ? 'right-0 rounded-l-2xl' : 'left-0 rounded-r-2xl',
          open && 'opacity-0',
        )}
      >
        <EkkoEyes phase={phase} className="h-3 w-[26px]" />
      </div>
      <aside
        className={cn(
          'ekko-shell absolute inset-y-2 flex w-[calc(100%-8px)] flex-col overflow-hidden',
          'transition-transform duration-300 ease-out-soft',
          right ? 'right-0 rounded-r-none' : 'left-0 rounded-l-none',
          open ? 'translate-x-0' : right ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        <EkkoBar className="border-b border-border-soft" />
        <PanelShell layout="compact" className="min-h-0 flex-1" />
      </aside>
    </div>
  )
}
