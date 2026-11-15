import { AlarmClock, Droplets, ListChecks, Timer } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRemaining } from '@/lib/time'
import { useHabits } from '@/features/habits/store'
import { formatWhen } from '@/features/tasks/due'
import { useTasks } from '@/features/tasks/store'
import { useTimers } from '@/features/timers/store'
import { useNow } from '@/surfaces/shared/useNow'
import type { PageProps } from '@/surfaces/panel/pages'
import { StatCard } from '@/ui/data'

/** Kobi-style summary cards; each one opens its page. */
export function HomeCards({ compact, go }: PageProps) {
  const water = useHabits((s) => s.water)
  const addWater = useHabits((s) => s.addWater)
  const tasks = useTasks((s) => s.tasks)
  const reminders = useTasks((s) => s.reminders)
  const timers = useTimers((s) => s.timers)
  const running = timers.filter((t) => t.pausedLeft === undefined)
  const now = useNow(running.length > 0)

  const open = tasks.filter((t) => !t.done)
  const overdue = open.filter((t) => t.due !== undefined && t.due < now).length
  const next = reminders.filter((r) => r.at > now).sort((a, b) => a.at - b.at)[0]
  const soonest = running.sort((a, b) => a.endsAt - b.endsAt)[0]

  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-4')}>
      <div className="relative">
        <StatCard
          icon={Droplets}
          label="Água"
          value={`${water.count}/${water.goal}`}
          sub="copos hoje"
          progress={water.count / water.goal}
          onClick={() => go('habits')}
        />
        <button
          type="button"
          aria-label="Bebi um copo"
          title="Bebi um copo"
          onClick={() => addWater(1)}
          className="absolute top-2 right-2 grid size-6 place-items-center rounded-full border border-accent/40 text-[13px] text-accent hover:bg-accent/15"
        >
          +
        </button>
      </div>
      <StatCard
        icon={ListChecks}
        label="Tarefas"
        value={open.length}
        sub={
          overdue ? (
            <span className="text-danger">
              {overdue} atrasada{overdue > 1 ? 's' : ''}
            </span>
          ) : (
            'em aberto'
          )
        }
        onClick={() => go('tasks')}
      />
      <StatCard
        icon={AlarmClock}
        label="Avisos"
        value={reminders.length}
        sub={next ? `próximo ${formatWhen(next.at, now)}` : 'nada agendado'}
        onClick={() => go('tasks')}
      />
      <StatCard
        icon={Timer}
        label="Timers"
        value={
          soonest ? (
            <span className="font-mono">{formatRemaining(soonest.endsAt - now)}</span>
          ) : (
            running.length
          )
        }
        sub={soonest ? soonest.label : 'nenhum rodando'}
        progress={soonest ? 1 - (soonest.endsAt - now) / (soonest.total * 1000) : undefined}
        onClick={() => go('timers')}
      />
    </div>
  )
}
