import { useState } from 'react'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'
import { EkkoFace } from '@/ui/EkkoFace'
import { PanelShell } from '../panel/PanelShell'
import { PresenceLine } from '../shared/PresenceLine'
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

  const tabY = Math.round((height - TAB.h) / 2)
  useHitRect(
    open
      ? { x: 0, y: 0, w: width, h: height }
      : { x: right ? width - TAB.w : 0, y: tabY, w: TAB.w, h: TAB.h },
  )
  useSummon(() => setPinned((p) => !p))
  useEscape(() => setPinned(false))

  return (
    <div ref={ref} {...bind} className="no-select relative h-full w-full overflow-hidden">
      <div
        style={{ top: tabY, height: TAB.h, width: TAB.w }}
        className={cn(
          'absolute grid place-items-center border border-accent/25 bg-base/95 transition-opacity',
          right ? 'right-0 rounded-l-2xl border-r-0' : 'left-0 rounded-r-2xl border-l-0',
          open && 'opacity-0',
        )}
      >
        <EkkoFace phase={phase} className="size-6" />
      </div>
      <aside
        className={cn(
          'absolute inset-y-2 flex w-[calc(100%-8px)] flex-col overflow-hidden border border-accent/20 bg-base/97',
          'transition-transform duration-300 ease-out-soft',
          right ? 'right-0 rounded-l-2xl border-r-0' : 'left-0 rounded-r-2xl border-l-0',
          open ? 'translate-x-0' : right ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        <div className="flex h-11 shrink-0 items-center border-b border-border-soft">
          <PresenceLine />
        </div>
        <PanelShell layout="compact" className="min-h-0 flex-1" />
      </aside>
    </div>
  )
}
