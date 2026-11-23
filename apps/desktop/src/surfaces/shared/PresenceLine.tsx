import { Music2, Square, Timer, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { type Activity } from '@/stores/assistant'
import { usePresence } from '@/stores/liveActivity'
import { demo } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { EkkoFace } from '@/ui/EkkoFace'
import { Waveform } from '@/ui/Waveform'
import { MiniTransport } from '@/features/music/MiniTransport'
import { useAudioLevels } from '@/features/music/useAudioLevels'
import { HudChip } from '@/features/hud/HudChips'
import { formatRemaining } from '@/lib/time'
import { EventChip } from './EventChip'
import { useNow } from './useNow'

/**
 * One-line presence readout: avatar + whatever matters right now (phase, toast or live
 * activity). Used by the notch pill, the dock strip header and the voice overlay.
 */
export function PresenceLine({
  compact = false,
  eyes = false,
  center = false,
}: {
  compact?: boolean
  /** Notch look: bare glowing eyes instead of the ringed face; centered when idle. */
  eyes?: boolean
  /** Keep the eyes in the middle even with something going on (the open notch). */
  center?: boolean
}) {
  const p = usePresence()
  const name = useSettings((s) => s.settings.assistantName)
  const show = useSettings((s) => s.settings.appearance.pillShow)
  const quiet = p.phase === 'idle' && !p.toast && !p.activity
  const glide = eyes && show.avatar
  // Centered eyes say it all; the readout only shows next to eyes on the left.
  const centered = glide && (center || quiet)
  const what = p.phase !== 'idle' ? p.phase : p.toast ? 'toast' : (p.activity?.kind ?? 'quiet')

  return (
    // Not `relative` in the notch: the eyes center on the whole bar (the parent).
    <div
      className={cn('flex h-full min-w-0 flex-1 items-center gap-2.5 px-3', !glide && 'relative')}
    >
      {glide && (
        // Same element in both spots, so it glides (and keeps blinking) instead of jumping.
        <span
          className={cn(
            'pointer-events-none absolute top-1/2 transition-[left,translate,width,height] duration-[450ms] ease-out-soft',
            centered
              ? 'left-1/2 h-4.5 w-10 -translate-x-1/2 -translate-y-1/2'
              : 'left-3 h-3.5 w-8 translate-x-0 -translate-y-1/2',
          )}
        >
          <EkkoEyes phase={p.phase} className="size-full" />
        </span>
      )}
      {!centered && (
        <span key={what} className="animate-fade-in flex min-w-0 flex-1 items-center gap-2.5">
          {glide && <span className="w-8 shrink-0" aria-hidden />}
          {show.avatar && !eyes && <EkkoFace phase={p.phase} className="size-6 shrink-0" />}
          <Readout
            compact={compact}
            name={name}
            statusDot={show.statusDot}
            controls={eyes && show.musicControls}
          />
        </span>
      )}
      {show.clock && p.phase === 'idle' && <Clock />}
    </div>
  )
}

/** What is going on, next to the avatar: phase, toast, live activity or the name. */
function Readout({
  compact,
  name,
  statusDot,
  controls,
}: {
  compact: boolean
  name: string
  statusDot: boolean
  /** Song buttons next to the music chip (notch only, optional in settings). */
  controls: boolean
}) {
  const p = usePresence()
  if (p.phase === 'listening') {
    return (
      <>
        <span className="size-1.5 shrink-0 rounded-full bg-danger" />
        <Caption text={p.caption} />
        <Waveform tone="danger" />
      </>
    )
  }
  if (p.phase === 'thinking') {
    return (
      <>
        <Caption text="Pensando" />
        <Dots />
        <StopButton label="Cancelar" icon="x" />
      </>
    )
  }
  if (p.phase === 'speaking') {
    return (
      <>
        <Caption text={p.caption} />
        <Waveform />
        <StopButton label="Interromper" icon="square" />
      </>
    )
  }
  if (p.toast) {
    return (
      <>
        <span className="label-hud shrink-0 text-accent!">{name}</span>
        <Caption text={p.toast} />
      </>
    )
  }
  if (p.activity) return <ActivityChip activity={p.activity} controls={controls} />
  return (
    <>
      {statusDot && (
        <span className="animate-hud-breathe size-1.5 shrink-0 rounded-full bg-accent" />
      )}
      {!compact && <span className="label-hud">{name}</span>}
    </>
  )
}

/** HH:MM on the right of the pill (optional in Configurações → Pílula e avisos). */
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

function ActivityChip({ activity, controls }: { activity: Activity; controls: boolean }) {
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
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {controls && <MiniTransport playing={activity.playing} />}
          <MusicBars playing={activity.playing} />
        </span>
      </span>
    )
  }
  if (activity.kind === 'event') {
    return (
      <EventChip
        activity={activity}
        now={now}
        when={eventWhen(activity.startsAt, activity.endsAt, now)}
      />
    )
  }
  if (activity.kind === 'hud') return <HudChip activity={activity} />
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

/** Bars that follow the song itself (bass first), flat while paused. */
function MusicBars({ playing }: { playing: boolean }) {
  const levels = useAudioLevels(playing)
  return (
    <Waveform
      bars={4}
      levels={levels ?? [0, 0, 0, 0]}
      className={cn('h-3', !playing && 'opacity-30')}
    />
  )
}
