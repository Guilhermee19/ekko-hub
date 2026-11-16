import { CalendarDays, Music2, Square, Timer, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type Activity } from '@/stores/assistant'
import { usePresence } from '@/stores/liveActivity'
import { demo } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { EkkoFace } from '@/ui/EkkoFace'
import { Waveform } from '@/ui/Waveform'
import { formatRemaining } from '@/lib/time'
import { useNow } from './useNow'

/**
 * One-line presence readout: avatar + whatever matters right now (phase, toast or live
 * activity). Used by the notch pill, the dock strip header and the voice overlay.
 */
export function PresenceLine({ compact = false }: { compact?: boolean }) {
  const p = usePresence()
  const name = useSettings((s) => s.settings.assistantName)
  const show = useSettings((s) => s.settings.appearance.pillShow)

  return (
    <div className="flex h-full min-w-0 flex-1 items-center gap-2.5 px-3">
      {show.avatar && <EkkoFace phase={p.phase} className="size-6 shrink-0" />}
      {p.phase === 'listening' && (
        <>
          <span className="size-1.5 shrink-0 rounded-full bg-danger" />
          <Caption text={p.caption} />
          <Waveform tone="danger" />
        </>
      )}
      {p.phase === 'thinking' && (
        <>
          <Caption text="Pensando" />
          <Dots />
          <StopButton label="Cancelar" icon="x" />
        </>
      )}
      {p.phase === 'speaking' && (
        <>
          <Caption text={p.caption} />
          <Waveform />
          <StopButton label="Interromper" icon="square" />
        </>
      )}
      {p.phase === 'idle' && p.toast && (
        <>
          <span className="label-hud shrink-0 text-accent!">{name}</span>
          <Caption text={p.toast} />
        </>
      )}
      {p.phase === 'idle' && !p.toast && p.activity && <ActivityChip activity={p.activity} />}
      {p.phase === 'idle' && !p.toast && !p.activity && (
        <>
          {show.statusDot && (
            <span className="animate-hud-breathe size-1.5 shrink-0 rounded-full bg-accent" />
          )}
          {!compact && <span className="label-hud">{name}</span>}
        </>
      )}
      {show.clock && p.phase === 'idle' && <Clock />}
    </div>
  )
}

/** HH:MM on the right of the pill (optional in Aparência → Pílula). */
function Clock() {
  const now = useNow(true, 15_000)
  const d = new Date(now)
  return (
    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted tabular-nums">
      {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
    </span>
  )
}

function Caption({ text }: { text: string }) {
  return <span className="min-w-0 flex-1 truncate text-[12.5px] text-content">{text}</span>
}

function Dots() {
  return (
    <span className="flex flex-1 gap-1">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="animate-bounce-dot size-1 rounded-full bg-accent"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  )
}

function StopButton({ label, icon }: { label: string; icon: 'x' | 'square' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={demo.idle}
      className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-hover text-muted hover:text-content"
    >
      {icon === 'x' ? <X className="size-3.5" /> : <Square className="size-2.5 fill-current" />}
    </button>
  )
}

function ActivityChip({ activity }: { activity: Activity }) {
  const now = useNow(activity.kind === 'timer' || activity.kind === 'event')
  const chip = 'flex min-w-0 flex-1 items-center gap-2 text-[12.5px]'
  if (activity.kind === 'timer') {
    return (
      <span className={chip}>
        <span className="size-1.5 rounded-full bg-accent" />
        <Timer className="size-3.5 text-accent" />
        <span className="min-w-0 truncate text-muted">{activity.label}</span>
        <span className="ml-auto font-mono font-semibold text-accent tabular-nums">
          {formatRemaining(activity.endsAt - now)}
        </span>
      </span>
    )
  }
  if (activity.kind === 'music') {
    return (
      <span className={chip}>
        <Music2 className="size-3.5 shrink-0 text-accent" />
        <span className="truncate">{activity.title}</span>
        <span className="truncate text-muted">· {activity.artist}</span>
        <Waveform bars={4} className={cn('ml-auto h-3', !activity.playing && 'opacity-30')} />
      </span>
    )
  }
  if (activity.kind === 'event') {
    return (
      <span className={chip}>
        <CalendarDays className="size-3.5 shrink-0 text-accent" />
        <span className="truncate">{activity.title}</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-accent tabular-nums">
          {eventWhen(activity.startsAt, activity.endsAt, now)}
        </span>
      </span>
    )
  }
  return (
    <span className={chip}>
      <Volume2 className="size-3.5 text-accent" />
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-border-soft">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${activity.level * 100}%` }}
        />
      </span>
      <span className="font-mono text-[11px] text-muted tabular-nums">
        {Math.round(activity.level * 100)}%
      </span>
    </span>
  )
}

/** "em 8 min", "agora", "até 15:30" for an event chip. */
export function eventWhen(startsAt: number, endsAt: number, now: number): string {
  if (now >= endsAt) return 'acabou'
  if (now >= startsAt) {
    const end = new Date(endsAt)
    return `até ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  }
  const min = Math.ceil((startsAt - now) / 60_000)
  if (min <= 1) return 'agora'
  if (min < 60) return `em ${min} min`
  const h = Math.floor(min / 60)
  return `em ${h}h${String(min % 60).padStart(2, '0')}`
}
