import { AlarmClock, BellRing, Timer } from 'lucide-react'
import { useId } from 'react'
import { useEscape } from '@/surfaces/shared/useOverlay'
import { useNow } from '@/surfaces/shared/useNow'
import { ProgressRing } from '@/ui/data'
import { Button, HudFrame, Kbd } from '@/ui/primitives'

export interface Alarm {
  id: string
  kind: 'timer' | 'reminder'
  title: string
  /** Extra line ("Timer de 5 min", "Lembrete das 15:00"). */
  detail?: string
  /** Epoch ms when it fired. */
  firedAt: number
}

interface AlarmOverlayProps {
  alarm: Alarm
  onSnooze: () => void
  onDismiss: () => void
}

const SNOOZE_MIN = 5

/** On-screen alarm card (~420×260) for a fired timer/reminder. Esc dismisses. */
export function AlarmOverlay({ alarm, onSnooze, onDismiss }: AlarmOverlayProps) {
  const titleId = useId()
  useEscape(onDismiss)
  const now = useNow(true, 1000)
  const since = Math.max(0, Math.floor((now - alarm.firedAt) / 1000))
  const time = new Date(alarm.firedAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const Icon = alarm.kind === 'timer' ? Timer : AlarmClock

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="animate-rise-in relative flex h-full max-h-[260px] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-accent/40 bg-base shadow-2xl"
    >
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="hud-vignette pointer-events-none absolute inset-0" />
      <HudFrame />
      <div className="relative z-10 flex flex-1 items-center gap-5 px-6">
        <div className="relative shrink-0">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20 motion-reduce:hidden" />
          <ProgressRing value={1} size={92} stroke={5}>
            <Icon className="hud-glow size-8 animate-pulse text-accent" />
          </ProgressRing>
        </div>
        <div className="min-w-0 flex-1">
          <div className="label-hud flex items-center gap-1.5">
            <BellRing className="size-3 text-accent" />
            {alarm.kind === 'timer' ? 'Timer terminou' : 'Lembrete'}
          </div>
          <h2 id={titleId} className="mt-1 line-clamp-2 text-[20px] leading-tight font-semibold">
            {alarm.title}
          </h2>
          {alarm.detail && <p className="mt-1 text-[12px] text-muted">{alarm.detail}</p>}
          <p className="mt-2 font-mono text-[12px] text-accent tabular-nums">
            {time}
            <span className="text-muted">
              {' · '}
              {since < 60 ? 'agora' : `há ${Math.floor(since / 60)} min`}
            </span>
          </p>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-end gap-2 border-t border-border-soft bg-surface/60 px-4 py-3">
        <Button variant="subtle" onClick={onSnooze}>
          Adiar {SNOOZE_MIN} min
        </Button>
        <Button variant="primary" autoFocus onClick={onDismiss}>
          Dispensar <Kbd>Esc</Kbd>
        </Button>
      </div>
    </div>
  )
}

/** Sample alarm for the gallery/demo. */
export function demoAlarm(): Alarm {
  return {
    id: `alarm-${Date.now().toString(36)}`,
    kind: 'timer',
    title: 'Pão de queijo no forno',
    detail: 'Timer de 25 min',
    firedAt: Date.now(),
  }
}

/** Snooze helper: the same alarm firing again in SNOOZE_MIN minutes. */
export const snoozeMs = SNOOZE_MIN * 60_000
