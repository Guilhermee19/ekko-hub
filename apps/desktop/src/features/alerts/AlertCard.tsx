import {
  AlarmClock,
  BatteryLow,
  Bell,
  Bluetooth,
  CalendarDays,
  Check,
  ExternalLink,
  Mail,
  Timer,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { useCalendar } from '@/features/calendar/store'
import { openMail } from '@/features/mail/store'
import { copyColor } from '@/features/colors/store'
import { useMusic } from '@/features/music/store'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { dismissAlert, holdAlert, snoozeAlert, type Alert, type AlertKind } from './store'

const ICON: Record<Exclude<AlertKind, 'music' | 'color'>, LucideIcon> = {
  timer: Timer,
  reminder: AlarmClock,
  event: CalendarDays,
  battery: BatteryLow,
  device: Bluetooth,
  notice: Bell,
  email: Mail,
}

/**
 * The notch grown into a card for a few seconds: artwork or icon, a short label, the
 * title big and the detail. Hover keeps it; a click on it opens the panel.
 */
export function AlertCard({ alert, onOpen }: { alert: Alert; onOpen: () => void }) {
  const warn = alert.kind === 'battery'
  return (
    <div
      onPointerEnter={() => holdAlert(true)}
      onPointerLeave={() => holdAlert(false)}
      onClick={() => {
        dismissAlert()
        onOpen()
      }}
      className="animate-alert-in flex h-full cursor-pointer items-center gap-3.5 px-4 pt-1"
    >
      <Art alert={alert} />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wider uppercase',
            warn ? 'text-danger' : 'text-accent',
          )}
        >
          <EkkoEyes phase="idle" className="h-2.5 w-[22px] shrink-0" />
          <span className="truncate">{alert.label}</span>
        </div>
        <div className="mt-0.5 truncate text-[19px] leading-tight font-semibold text-content">
          {alert.title}
        </div>
        {alert.detail && <div className="truncate text-[12px] text-muted">{alert.detail}</div>}
        {alert.kind === 'music' && <MusicProgress />}
      </div>
      <Actions alert={alert} />
    </div>
  )
}

function Art({ alert }: { alert: Alert }) {
  if (alert.kind === 'color') {
    return (
      <span
        className="size-14 shrink-0 rounded-xl border border-white/15 shadow-lg"
        style={{ background: alert.color?.hex }}
        aria-hidden
      />
    )
  }
  if (alert.kind === 'music') {
    return (
      <span
        className="size-14 shrink-0 rounded-xl bg-cover bg-center shadow-lg"
        style={{ background: alert.cover }}
        aria-hidden
      />
    )
  }
  const Icon = ICON[alert.kind]
  const low = alert.kind === 'battery'
  return (
    <span
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-full',
        low ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent',
      )}
      aria-hidden
    >
      <Icon className="size-6" />
    </span>
  )
}

function MusicProgress() {
  const pos = useMusic((s) => s.positionSec)
  const total = useMusic((s) => s.track?.durationSec ?? 0)
  if (!total) return null
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border-soft">
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
        style={{ width: `${Math.min(100, (pos / total) * 100)}%` }}
      />
    </div>
  )
}

function Actions({ alert }: { alert: Alert }) {
  // Buttons act without opening the panel.
  const act = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  const button =
    'rounded-full px-3 py-1 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none'
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {alert.color && <CopyFormats color={alert.color} />}
      {alert.snooze && (
        <button
          type="button"
          onClick={act(() => snoozeAlert(alert))}
          className={cn(button, 'bg-surface-hover text-content hover:bg-border-soft')}
        >
          Adiar 5 min
        </button>
      )}
      {alert.event && (
        <button
          type="button"
          title="Já vi: para de avisar e sai do notch"
          onClick={act(() => {
            useCalendar.getState().ack(alert.event!)
            dismissAlert()
          })}
          className={cn(
            button,
            'flex items-center gap-1 bg-surface-hover text-content hover:bg-border-soft',
          )}
        >
          <Check className="size-3.5" aria-hidden /> Confirmar
        </button>
      )}
      {alert.mail && (
        <button
          type="button"
          title="Abrir o e-mail no navegador"
          onClick={act(() => {
            openMail(alert.mail!)
            dismissAlert()
          })}
          className={cn(button, 'flex items-center gap-1 bg-accent-strong text-white')}
        >
          <ExternalLink className="size-3.5" aria-hidden /> Ver
        </button>
      )}
      {alert.meetLink && (
        <button
          type="button"
          onClick={act(() => {
            void backend.openExternal(alert.meetLink!)
            // Joining the call is as good as confirming it.
            if (alert.event) useCalendar.getState().ack(alert.event)
            dismissAlert()
          })}
          className={cn(button, 'flex items-center gap-1 bg-accent-strong text-white')}
        >
          <Video className="size-3.5" aria-hidden /> Entrar
        </button>
      )}
      <button
        type="button"
        aria-label={alert.snooze ? 'Ok, parar o alarme' : 'Fechar aviso'}
        title={alert.snooze ? 'Ok' : 'Fechar'}
        onClick={act(dismissAlert)}
        className="grid size-7 place-items-center rounded-full bg-surface-hover text-muted transition-colors hover:text-content"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

/** HEX / RGB / HSL buttons: each copies its format and shows a check for a moment. */
function CopyFormats({ color }: { color: NonNullable<Alert['color']> }) {
  const [done, setDone] = useState<string | null>(null)
  const formats = [
    ['HEX', color.hex.toUpperCase()],
    ['RGB', color.rgb],
    ['HSL', color.hsl],
  ] as const
  return (
    <div className="flex items-center gap-1">
      {formats.map(([name, text]) => (
        <button
          key={name}
          type="button"
          title={`Copiar ${text}`}
          onClick={(e) => {
            e.stopPropagation()
            copyColor(text)
            setDone(name)
            window.setTimeout(() => setDone((d) => (d === name ? null : d)), 1200)
          }}
          className={cn(
            'rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
            done === name
              ? 'bg-accent text-(--color-base)'
              : 'bg-surface-hover text-content hover:bg-border-soft',
          )}
        >
          {done === name ? 'Copiado' : name}
        </button>
      ))}
    </div>
  )
}
