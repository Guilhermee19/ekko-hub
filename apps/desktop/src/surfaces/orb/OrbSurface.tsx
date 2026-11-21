import { useRef, type PointerEvent } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
import { SeasonSky } from '@/features/season/SeasonSky'
import { useSeason } from '@/features/season/useSeason'
import { EkkoEyes } from '@/ui/EkkoEyes'

const DRAG_THRESHOLD = 4

/** Floating bubble in the notch's look (black, bottom light, Ekko's eyes): drag to move
 *  (position saved by the backend), click to open the panel. */
export function OrbSurface() {
  const phase = useAssistant((s) => s.phase)
  const hasActivity = useAssistant((s) => Boolean(s.activity || s.toast))
  const start = useRef<{ x: number; y: number } | null>(null)
  const season = useSeason()

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.screenX, y: e.screenY }
  }
  const onPointerMove = (e: PointerEvent) => {
    const s = start.current
    if (!s) return
    if (Math.hypot(e.screenX - s.x, e.screenY - s.y) > DRAG_THRESHOLD) {
      start.current = null
      void backend.startDragging()
    }
  }
  const onPointerUp = () => {
    if (start.current) void backend.showPanelBesideOrb()
    start.current = null
  }

  return (
    <div className="no-select grid h-full w-full place-items-center">
      <button
        type="button"
        aria-label="Abrir o Ekko"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        data-season={season ?? undefined}
        className={cn(
          'ekko-glow relative grid size-[72px] cursor-pointer place-items-center rounded-full',
          'transition-transform hover:scale-105',
          phase === 'listening' && 'ring-1 ring-danger/60',
        )}
      >
        {season && (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <SeasonSky season={season} props={false} />
          </span>
        )}
        <span
          className={cn(
            'absolute inset-[-3px] rounded-full border-2 border-transparent',
            phase === 'thinking' && 'animate-hud-fast border-t-accent',
            phase === 'listening' && 'animate-hud-breathe border-danger/70',
            phase === 'speaking' && 'animate-hud-breathe border-accent/70',
          )}
        />
        <EkkoEyes phase={phase} className="relative h-5 w-11" />
        {hasActivity && (
          <span className="absolute top-1 right-1 size-3 rounded-full border-2 border-(--notch-ink) bg-accent" />
        )}
      </button>
    </div>
  )
}
