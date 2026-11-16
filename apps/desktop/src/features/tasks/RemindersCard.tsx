import { Bell, Repeat as RepeatIcon, X } from 'lucide-react'
import { Card } from '@/ui/primitives'
import { AddReminder } from './AddReminder'
import { formatClock, formatWhen } from './due'
import { useTasks } from './store'
import { REPEAT_LABEL } from './TaskRow'

/** Upcoming reminders: time + text, plus a quick add. */
export function RemindersCard({ now }: { now: number }) {
  const reminders = useTasks((s) => s.reminders)
  const remove = useTasks((s) => s.removeReminder)

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-muted">
        <Bell className="size-3.5" aria-hidden />
        <span className="label-hud">Lembretes</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums">{reminders.length}</span>
      </div>
      <AddReminder now={now} />
      {reminders.length === 0 ? (
        <p className="py-3 text-center text-[12px] text-muted">Nenhum lembrete. Crie um acima.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {reminders.map((r) => {
            const day = formatWhen(r.at, now).split(' ')[0]
            return (
              <li
                key={r.id}
                className="group flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-surface-hover"
              >
                <div className="w-12 shrink-0 text-right">
                  <div className="font-mono text-[13px] text-accent tabular-nums">
                    {formatClock(r.at)}
                  </div>
                  <div className="text-[10px] text-muted">{day}</div>
                </div>
                <div className="min-w-0 flex-1 text-[13px]">
                  <div className="truncate">{r.text}</div>
                  {r.repeat && (
                    <div className="flex items-center gap-1 text-[11px] text-muted">
                      <RepeatIcon className="size-3" aria-hidden /> {REPEAT_LABEL[r.repeat]}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remover lembrete ${r.text}`}
                  title="Remover"
                  onClick={() => void remove(r.id)}
                  className="grid size-6 place-items-center rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
