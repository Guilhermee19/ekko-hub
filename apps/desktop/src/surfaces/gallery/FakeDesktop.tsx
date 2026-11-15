import { Volume2, Wifi } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { DisplayMode } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { DockSurface } from '../dock/DockSurface'
import { HubSurface } from '../hub/HubSurface'
import { FAKE_SCREEN_W } from '@/lib/ipc/mock'
import { canvas, placeNotch } from '@/lib/notchGeometry'
import { NotchSurface } from '../notch/NotchSurface'
import { OrbSurface } from '../orb/OrbSurface'
import { PanelSurface } from '../panel/PanelSurface'
import { VoiceSurface } from '../voice/VoiceSurface'

const SCREEN = { w: FAKE_SCREEN_W, h: 760 }
const TASKBAR_H = 44
const WORK_H = SCREEN.h - TASKBAR_H

interface FakeDesktopProps {
  mode: DisplayMode
  popover: boolean
  onTogglePopover: () => void
}

/** A Windows-like desktop where each surface sits where its real window would. */
export function FakeDesktop({ mode, popover, onTogglePopover }: FakeDesktopProps) {
  const dockRight = useSettings((s) => s.settings.dockSide === 'right')
  const notch = useSettings((s) => s.settings.notch)
  const notchCanvas = canvas(notch.size)
  const notchLeft = placeNotch(SCREEN.w, notchCanvas.w, notch.offset).left
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-border-soft shadow-2xl"
      style={{
        width: SCREEN.w,
        height: SCREEN.h,
        background:
          'radial-gradient(ellipse at 30% 110%, #c2410c 0%, transparent 45%), radial-gradient(ellipse at 80% 20%, #6d28d9 0%, transparent 50%), linear-gradient(160deg, #1e1b4b, #7c2d12)',
      }}
    >
      {mode === 'notch' && (
        <Win style={{ left: notchLeft, top: 0, width: notchCanvas.w, height: notchCanvas.h }}>
          <NotchSurface />
        </Win>
      )}
      {mode === 'orb' && (
        <Win style={{ right: 24, bottom: TASKBAR_H + 60, width: 96, height: 96 }}>
          <OrbSurface />
        </Win>
      )}
      {mode === 'dock' && (
        <Win style={{ [dockRight ? 'right' : 'left']: 0, top: 0, width: 400, height: WORK_H }}>
          <DockSurface />
        </Win>
      )}
      {mode === 'hub' && (
        <Win style={{ left: 60, top: 24, width: SCREEN.w - 120, height: WORK_H - 48 }} frame>
          <HubSurface />
        </Win>
      )}
      {mode === 'voice-only' && (
        <Win
          style={{ left: (SCREEN.w - 560) / 2, bottom: TASKBAR_H + 40, width: 560, height: 140 }}
        >
          <VoiceSurface />
        </Win>
      )}
      {popover && (
        <Win
          style={
            mode === 'orb'
              ? { right: 132, bottom: TASKBAR_H + 60, width: 400, height: 580 }
              : { right: 12, bottom: TASKBAR_H + 12, width: 400, height: 580 }
          }
        >
          <PanelSurface />
        </Win>
      )}
      <Taskbar onTray={onTogglePopover} trayActive={mode === 'tray'} />
    </div>
  )
}

/** Isolated "window": its own viewport-like box so surfaces size themselves. */
function Win({
  style,
  frame,
  children,
}: {
  style: CSSProperties
  frame?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={
        frame
          ? 'absolute overflow-hidden rounded-lg border border-border-soft shadow-2xl'
          : 'absolute'
      }
      style={style}
    >
      <div className="h-full w-full [&>*]:h-full [&>*]:w-full">{children}</div>
    </div>
  )
}

function Taskbar({ onTray, trayActive }: { onTray: () => void; trayActive: boolean }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/10 bg-[#1c1c1ce6] px-4 text-white/80"
      style={{ height: TASKBAR_H }}
    >
      <div className="w-40" />
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="size-7 rounded-md bg-white/10" />
        ))}
      </div>
      <div className="flex w-40 items-center justify-end gap-3 text-[11px]">
        <button
          type="button"
          onClick={onTray}
          title="Ekko"
          className={
            trayActive ? 'rounded p-1 ring-1 ring-accent/70' : 'rounded p-1 hover:bg-white/10'
          }
        >
          <img src="/ekko-logo.svg" alt="Ekko" className="size-4" />
        </button>
        <Wifi className="size-3.5" />
        <Volume2 className="size-3.5" />
        <span className="text-right leading-tight">
          14:32
          <br />
          15/11/2026
        </span>
      </div>
    </div>
  )
}
