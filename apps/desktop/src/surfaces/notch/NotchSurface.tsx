import { Pin, PinOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
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
import { canvas, MINIMAL, notchBox, notchLook, PILL_H } from './layout'
import { useNotchDrag } from './useNotchDrag'

/**
 * Kobi-style notch: a pill glued to the top edge that morphs into the full panel.
 * Opens on hover or click (setting); stays open while you type or after a click,
 * until focus goes elsewhere or Esc. The top bar drags it along the edge.
 * The window is a transparent canvas; only the visible box takes the mouse.
 */
export function NotchSurface() {
  const presence = useAssistant()
  const notch = useSettings((s) => s.settings.notch)
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

  const expanded = hovered || held || pinned
  const look = notchLook(expanded, notch.idle, presence)
  const anchor = useNotchAnchor()
  const box = notchBox(look, notch.size, presence, anchor ?? undefined)
  const size = canvas(notch.size)

  useHitRect(box)
  useSummon(toggleHeld)
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
        style={{ left: box.x, width: box.w, height: box.h }}
        className={cn(
          'absolute top-0 flex flex-col overflow-hidden',
          'transition-[left,width,height,border-radius,box-shadow] duration-300 ease-out-soft',
          look !== 'line' && 'border border-t-0 bg-base',
          look === 'panel' &&
            'rounded-b-[22px] border-accent/25 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.8)]',
          look === 'pill' && 'rounded-b-[18px] border-accent/15',
          look === 'line' && 'cursor-pointer items-center',
          presence.phase === 'listening' && 'border-danger/40',
          drag.dragging && 'cursor-grabbing transition-none',
        )}
      >
        {look === 'line' && (
          <span
            className="hud-glow rounded-b-full bg-accent/70 text-accent"
            style={{ width: MINIMAL.bar.w, height: MINIMAL.bar.h }}
          />
        )}
        {look !== 'line' && (
          <div
            {...drag.handlers}
            title="Arraste para mover"
            className={cn('flex shrink-0 items-center', !drag.dragging && 'cursor-grab')}
            style={{ height: PILL_H }}
          >
            <PresenceLine />
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
        {expanded && (
          <PanelShell
            layout="wide"
            className="animate-fade-in min-h-0 flex-1 border-t border-border-soft"
          />
        )}
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
