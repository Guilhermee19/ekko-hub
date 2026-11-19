import { CalendarClock, Music2, Timer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { PillItem } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { pickPillItem } from '@/lib/pillPriority'
import { useSettings } from '@/stores/settings'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { Segmented } from '@/ui/primitives'
import { Waveform } from '@/ui/Waveform'
import { useAppearance } from './controls'

type Scene = 'idle' | PillItem | 'all'

const SCENES: { value: Scene; label: string }[] = [
  { value: 'idle', label: 'Repouso' },
  { value: 'timer', label: 'Timer' },
  { value: 'music', label: 'Música' },
  { value: 'event', label: 'Evento' },
  { value: 'all', label: 'Tudo junto' },
]

const ACTIVE: Record<Scene, PillItem[]> = {
  idle: [],
  timer: ['timer'],
  music: ['music'],
  event: ['event'],
  all: ['timer', 'event', 'music'],
}

/** Same widths as notch/layout.ts pillWidth, so the preview matches the real pill. */
const WIDTH: Record<PillItem | 'idle', number> = { idle: 150, timer: 220, event: 280, music: 320 }

/**
 * Live, local copy of the collapsed notch: uses the real CSS variables (radius, aura,
 * opacity, ears) plus the scale, toggles and priority, over mock activities.
 */
export function PillPreview() {
  const look = useAppearance()
  const name = useSettings((s) => s.settings.assistantName)
  const [scene, setScene] = useState<Scene>('all')
  const item = pickPillItem(ACTIVE[scene], look.pillShow, look.pillPriority)
  const show = look.pillShow
  const extra = show.clock ? 48 : 0

  return (
    <div className="flex flex-col gap-3">
      <div className="hud-grid relative flex h-24 max-w-xl justify-center overflow-hidden rounded-xl border border-border-soft bg-surface">
        <span className="label-hud absolute bottom-2 left-3">Prévia ao vivo</span>
        <div
          className={cn(
            'notch-pill notch-ears relative flex items-center gap-2.5 px-3 transition-[width,border-radius] duration-300 ease-out-soft',
            item === null && show.avatar && 'justify-center',
          )}
          style={{ width: WIDTH[item ?? 'idle'] + extra, height: 38, zoom: look.notchScale }}
        >
          {show.avatar && (
            <EkkoEyes
              phase="idle"
              className={item === null ? 'h-4.5 w-10' : 'h-3.5 w-8 shrink-0'}
            />
          )}
          {item === null && !show.avatar && (
            <>
              {show.statusDot && (
                <span className="animate-hud-breathe size-1.5 shrink-0 rounded-full bg-accent" />
              )}
              <span className="label-hud flex-1 truncate">{name}</span>
            </>
          )}
          {item === 'timer' && (
            <Row icon={<Timer className="size-3.5 shrink-0 text-accent" />} label="Foco">
              <span className="font-mono font-semibold text-accent tabular-nums">24:13</span>
            </Row>
          )}
          {item === 'event' && (
            <Row
              icon={<CalendarClock className="size-3.5 shrink-0 text-accent" />}
              label="Daily do time"
            >
              <span className="text-[11px] text-accent">em 12 min</span>
            </Row>
          )}
          {item === 'music' && (
            <Row icon={<Music2 className="size-3.5 shrink-0 text-accent" />} label="Midnight City">
              <Waveform bars={4} className="h-3" />
            </Row>
          )}
          {show.clock && (
            <span
              className={cn(
                'shrink-0 font-mono text-[11px] text-muted tabular-nums',
                item === null && show.avatar && 'absolute right-3',
              )}
            >
              09:41
            </span>
          )}
        </div>
      </div>
      <Segmented value={scene} options={SCENES} onChange={setScene} />
    </div>
  )
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px]">
      {icon}
      <span className="truncate">{label}</span>
      <span className="ml-auto shrink-0">{children}</span>
    </span>
  )
}
