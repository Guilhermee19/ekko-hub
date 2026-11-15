import {
  AlarmClock,
  BellOff,
  CheckCheck,
  Droplets,
  Info,
  Timer,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState, PageHeader } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { formatWhen, groupByDay } from './group'
import { selectUnread, useNotifications, type Notification, type NotificationKind } from './store'

const ICON: Record<NotificationKind, LucideIcon> = {
  reminder: AlarmClock,
  timer: Timer,
  habit: Droplets,
  system: Info,
}

/** Notification list (panel page or popover). Fills its container's width. */
export function NotificationCenter({ className }: { className?: string }) {
  const items = useNotifications((s) => s.items)
  const unread = useNotifications(selectUnread)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const clear = useNotifications((s) => s.clear)
  // Re-group once a minute so "Hoje" rolls over at midnight.
  const now = useNow(true, 60_000)
  const groups = groupByDay(items, now)

  return (
    <section className={cn('animate-rise-in flex min-h-0 flex-col', className)}>
      <PageHeader
        title="Notificações"
        hint={unread ? `${unread} não lida${unread > 1 ? 's' : ''}` : 'Tudo em dia'}
        actions={
          items.length > 0 && (
            <>
              <Button size="sm" variant="ghost" onClick={markAllRead} disabled={!unread}>
                <CheckCheck className="size-3.5" /> Marcar tudo como lido
              </Button>
              <IconButton label="Limpar tudo" onClick={clear}>
                <Trash2 className="size-3.5" />
              </IconButton>
            </>
          )
        }
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nenhuma notificação"
          hint="Timers, lembretes e avisos do PC aparecem aqui."
        />
      ) : (
        <div className="scroll-thin -mr-1 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.label}>
              <h2 className="label-hud mb-1.5">{g.label}</h2>
              <ul className="space-y-1.5">
                {g.items.map((n) => (
                  <NotificationRow key={n.id} item={n} now={now} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function NotificationRow({ item, now }: { item: Notification; now: number }) {
  const markRead = useNotifications((s) => s.markRead)
  const remove = useNotifications((s) => s.remove)
  const Icon = ICON[item.kind]
  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-2.5 transition-colors',
        item.read ? 'border-border-soft bg-surface' : 'border-accent/25 bg-surface-hover',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-full',
          item.read ? 'bg-base text-muted' : 'bg-accent/15 text-accent',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <button
        type="button"
        onClick={() => markRead(item.id)}
        className="min-w-0 flex-1 text-left focus-visible:outline-none"
        aria-label={`${item.title}${item.read ? '' : ', não lida'}`}
      >
        <span className="flex items-center gap-1.5">
          {!item.read && (
            <span className="hud-glow size-1.5 shrink-0 rounded-full bg-accent text-accent" />
          )}
          <span className={cn('truncate text-[13px]', !item.read && 'font-medium')}>
            {item.title}
          </span>
        </span>
        <span className="block text-[12px] text-muted">{item.body}</span>
      </button>
      <span className="shrink-0 font-mono text-[10px] text-muted tabular-nums">
        {formatWhen(item.at, now)}
      </span>
      <IconButton
        label="Remover"
        onClick={() => remove(item.id)}
        className="-my-1 size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <X className="size-3" />
      </IconButton>
    </li>
  )
}
