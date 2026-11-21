import { Pin, PinOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PrintCard } from '@/features/capture/PrintCard'
import { useRecentPrint } from '@/features/capture/useRecentPrint'
import { useSystemHud } from '@/features/hud/useSystemHud'
import { ShelfChip, SHELF_CHIP_W } from '@/features/shelf/ShelfChip'
import { SeasonSky } from '@/features/season/SeasonSky'
import { useSeason } from '@/features/season/useSeason'
import { ShelfTray } from '@/features/shelf/ShelfTray'
import { useShelf } from '@/features/shelf/store'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { usePresence } from '@/stores/liveActivity'
import { useSettings } from '@/stores/settings'
import { IconButton } from '@/ui/primitives'
import { PanelShell } from '../panel/PanelShell'
import { PresenceLine } from '../shared/PresenceLine'
import {
  useEscape,
  useHitRect,
  useOverlayHover,
  useSummon,
  useWindowFocus,
} from '../shared/useOverlay'
import { DropZone } from './DropZone'
import { CLOCK_W, canvas, isQuiet, MINIMAL, notchBox, notchLook, PILL_H } from './layout'
import { useFileDrop } from './useFileDrop'
import { useNotchDrag } from './useNotchDrag'

/**
 * The notch: the screen's black growing out of the top edge (concave "ears", soft
 * light at the bottom, Ekko's eyes), morphing into the full panel. Opens on hover or
 * click (setting); stays open while you type or after a click, until focus goes
 * elsewhere or Esc. The top bar drags it along the edge. Files dragged onto it go to
 * the shelf. The window is a transparent canvas; only the visible box takes the mouse.
 */
export function NotchSurface() {
  const presence = usePresence()
  const notch = useSettings((s) => s.settings.notch)
  const pillScale = useSettings((s) => s.settings.appearance.notchScale)
  const clickMode = notch.openOn === 'click'
  const { hovered, bind } = useOverlayHover({ enterDelay: notch.hoverDelayMs, enabled: !clickMode })
  /** Opened by a click / summon / typing: closes on blur or Esc, not on mouse leave. */
  const [held, setHeld] = useState(false)
  const [pinned, setPinned] = useState(false)
  const toggleHeld = () => {
    setHeld((h) => !h)
    void backend.focusSelf()
  }
  const drag = useNotchDrag(toggleHeld)
  const dropping = useFileDrop()
  const shelved = useShelf((s) => s.items.length > 0)
  const recent = useRecentPrint()
  const season = useSeason()

  const expanded = hovered || held || pinned
  const look = notchLook(expanded, notch.idle, presence, dropping, recent.print !== null)
  const anchor = useNotchAnchor()
  const showClock = useSettings((s) => s.settings.appearance.pillShow.clock)
  const extraW = (showClock ? CLOCK_W : 0) + (shelved ? SHELF_CHIP_W : 0)
  const box = notchBox(look, notch.size, presence, anchor ?? undefined, pillScale, extraW)
  // The pill zooms its content; the box (hit rect) is already scaled, so undo it in px.
  const zoom = look === 'pill' ? pillScale : 1
  const size = canvas(notch.size)
  const open = look === 'panel' || look === 'drop' || look === 'print'

  useHitRect(box)
  useSummon(toggleHeld)
  useSystemHud()
  useEscape(() => {
    setHeld(false)
    setPinned(false)
  })
  useWindowFocus((focused) => !focused && setHeld(false))

  return (
    <div className="no-select relative" style={{ width: size.w, height: size.h }}>
      <div
        {...bind}
        // Typing in the panel keeps it open even if the mouse wanders off.
        onFocusCapture={(e) => e.target.matches('input, textarea') && setHeld(true)}
        // The thin line has no top bar, so the whole line is the click target.
        onClick={look === 'line' ? toggleHeld : undefined}
        style={{
          left: box.x / zoom,
          width: box.w / zoom,
          height: box.h / zoom,
          zoom,
          // Notch → Animação de abrir.
          transitionDuration: `${notch.openMs}ms`,
        }}
        className={cn(
          'absolute top-0',
          'transition-[left,width,height,border-radius,box-shadow] duration-300 ease-out-soft',
          look === 'pill' && 'notch-pill notch-ears',
          open && 'notch-open notch-ears',
          look === 'line' && 'cursor-pointer',
          presence.phase === 'listening' && look !== 'line' && 'notch-live',
          drag.dragging && 'cursor-grabbing transition-none',
        )}
        data-season={season ?? undefined}
      >
        <div
          className={cn(
            'flex h-full flex-col overflow-hidden rounded-[inherit]',
            look === 'line' && 'items-center',
          )}
        >
          {look === 'line' && (
            <span
              className="hud-glow rounded-b-full bg-accent/70 text-accent"
              style={{ width: MINIMAL.bar.w, height: MINIMAL.bar.h }}
            />
          )}
          {look === 'drop' && <DropZone />}
          {look === 'print' && recent.print && (
            <div
              className="h-full"
              onPointerEnter={() => recent.hold(true)}
              onPointerLeave={() => recent.hold(false)}
            >
              <PrintCard key={recent.print.path} print={recent.print} onClose={recent.dismiss} />
            </div>
          )}
          {(look === 'pill' || look === 'panel') && (
            <div
              {...drag.handlers}
              title="Arraste para mover"
              className={cn('relative flex shrink-0 items-center', !drag.dragging && 'cursor-grab')}
              style={{ height: PILL_H }}
            >
              {season && (
                <SeasonSky season={season} props={look === 'panel' || isQuiet(presence)} />
              )}
              <PresenceLine eyes center={look === 'panel'} />
              <ShelfChip />
              {expanded && (
                <IconButton
                  label={pinned ? 'Desafixar' : 'Fixar aberto'}
                  active={pinned}
                  onClick={() => setPinned((p) => !p)}
                  className="mr-2 size-7"
                >
                  {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                </IconButton>
              )}
            </div>
          )}
          {look === 'panel' && (
            <>
              <ShelfTray />
              <PanelShell
                layout="wide"
                className="animate-fade-in min-h-0 flex-1 border-t border-border-soft"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Where the backend placed the pill center inside this window. */
function useNotchAnchor() {
  const [anchor, setAnchor] = useState<number | null>(null)
  useEffect(() => {
    void backend.getNotchAnchor().then(setAnchor)
    const off = backend.onNotchAnchor(setAnchor)
    return () => void off.then((f) => f())
  }, [])
  return anchor
}
