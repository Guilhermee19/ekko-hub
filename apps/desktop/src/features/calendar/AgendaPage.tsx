import { CalendarDays, CalendarOff, MapPin, RefreshCw, Video } from 'lucide-react'
import { useEffect } from 'react'
import { backend, type CalendarEvent } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useIntegrations } from '@/features/integrations/store'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { Badge, EmptyState, PageHeader } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { clock, dayFraction, isOngoing, nextEvent, relative, splitByDay } from './agenda'
import { useCalendar } from './store'

const FROM_HOUR = 7
const TO_HOUR = 23

export function AgendaPage({ compact }: PageProps) {
  const { events, connected, loading, error, refresh } = useCalendar()
  const now = useNow(true, 30_000)

  useEffect(() => {
    void useIntegrations.getState().refresh()
  }, [])

  const next = nextEvent(events, now)
  const { allDay, today, later } = splitByDay(events, now)

  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="Agenda"
        hint={
          connected
            ? next
              ? `${next.title} ${relative(next, now)}`
              : 'Nada marcado nas próximas 24 h'
            : 'Google Agenda desconectado'
        }
        actions={
          connected && (
            <IconButton label="Atualizar agenda" disabled={loading} onClick={() => void refresh()}>
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden />
            </IconButton>
          )
        }
      />

      {!connected ? (
        <Disconnected />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={error ? 'Não consegui ler a agenda' : 'Agenda livre'}
          hint={error ?? 'Nenhum evento nas próximas 24 horas. Aproveite.'}
        />
      ) : (
        <>
          {next && <NextCard event={next} now={now} />}
          {allDay.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allDay.map((e) => (
                <Badge key={e.id} tone="accent">
                  {e.title}
                </Badge>
              ))}
            </div>
          )}
          {!compact && today.length > 0 && <DayBar events={today} now={now} />}
          <EventList title="Hoje" events={today} now={now} />
          <EventList title="Amanhã" events={later} now={now} />
          {error && <p className="text-[11px] text-danger">{error}</p>}
        </>
      )}
    </div>
  )
}

function Disconnected() {
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState
        icon={CalendarOff}
        title="Conecte sua Google Agenda"
        hint="Em Configurações → Conexões. O Ekko avisa 10 minutos antes de cada reunião."
      />
      <Button variant="primary" onClick={() => void backend.openSettings()}>
        Abrir Conexões
      </Button>
    </div>
  )
}

function JoinButton({ event }: { event: CalendarEvent }) {
  if (!event.meetLink) return null
  const link = event.meetLink
  return (
    <Button size="sm" variant="primary" onClick={() => void backend.openExternal(link)}>
      <Video className="size-3.5" aria-hidden /> Entrar na reunião
    </Button>
  )
}

function NextCard({ event, now }: { event: CalendarEvent; now: number }) {
  const ongoing = isOngoing(event, now)
  return (
    <section className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-accent">
          {ongoing ? 'Acontecendo agora' : `Próximo, ${relative(event, now)}`}
        </div>
        <div className="truncate text-[14px] font-semibold">{event.title}</div>
        <div className="text-[12px] text-muted">
          {clock(event.startMs)} – {clock(event.endMs)} · {event.calendarName}
        </div>
      </div>
      <JoinButton event={event} />
    </section>
  )
}

/** Today from 7h to 23h: event blocks plus a "now" marker. */
function DayBar({ events, now }: { events: CalendarEvent[]; now: number }) {
  const pct = (ms: number) => `${dayFraction(ms, FROM_HOUR, TO_HOUR) * 100}%`
  return (
    <div aria-hidden className="relative mb-3 h-6 rounded-md border border-border-soft bg-base/40">
      {events.map((e) => (
        <span
          key={e.id}
          title={e.title}
          className="absolute inset-y-1 rounded-sm bg-accent/50"
          style={{
            left: pct(e.startMs),
            width: `max(4px, calc(${pct(e.endMs)} - ${pct(e.startMs)}))`,
          }}
        />
      ))}
      <span className="absolute inset-y-0 w-px bg-danger" style={{ left: pct(now) }} />
      <span className="absolute -bottom-4 left-0 text-[10px] text-muted">{FROM_HOUR}h</span>
      <span className="absolute right-0 -bottom-4 text-[10px] text-muted">{TO_HOUR}h</span>
    </div>
  )
}

function EventList({
  title,
  events,
  now,
}: {
  title: string
  events: CalendarEvent[]
  now: number
}) {
  if (events.length === 0) return null
  return (
    <section className="mt-2 flex flex-col gap-1">
      <h2 className="text-[11px] font-medium tracking-wide text-muted uppercase">{title}</h2>
      <ul className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface">
        {events.map((e) => (
          <li
            key={e.id}
            className={cn('flex items-center gap-3 px-3 py-2', e.endMs <= now && 'opacity-50')}
          >
            <div className="w-11 shrink-0 font-mono text-[12px] tabular-nums">
              {clock(e.startMs)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{e.title}</div>
              <div className="flex items-center gap-1 truncate text-[11px] text-muted">
                {e.location && <MapPin className="size-3 shrink-0" aria-hidden />}
                {e.location ?? e.calendarName}
              </div>
            </div>
            <JoinButton event={e} />
          </li>
        ))}
      </ul>
    </section>
  )
}
