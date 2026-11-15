import {
  BookOpen,
  Check,
  Dumbbell,
  Eye,
  Flame,
  PersonStanding,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/ui/primitives'
import { streakOf, useHabits, type Habit, type HabitIcon } from './store'

const ICONS: Record<HabitIcon, LucideIcon> = {
  book: BookOpen,
  dumbbell: Dumbbell,
  eye: Eye,
  stretch: PersonStanding,
}

const DAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const amount = (h: Habit, v: number) => (h.unit === 'min' ? `${v} min` : `${v}×`)

/** One habit: today's progress, check-in button and a 7-day row of dots. */
export function HabitRow({ habit, today }: { habit: Habit; today: number }) {
  const { checkIn, undo } = useHabits.getState()
  const Icon = ICONS[habit.icon]
  const done = habit.progress >= habit.target
  const streak = streakOf(habit.week)
  const pct = Math.round((habit.progress / habit.target) * 100)

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg',
            done ? 'bg-accent/15 text-accent' : 'bg-surface-hover text-muted',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{habit.label}</div>
          <div className="font-mono text-[11px] text-muted tabular-nums">
            {amount(habit, habit.progress)} / {amount(habit, habit.target)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (done ? undo(habit.id) : checkIn(habit.id))}
          aria-label={
            done
              ? `Desfazer check-in de ${habit.label}`
              : `Check-in de ${habit.label}: +${amount(habit, habit.step)}`
          }
          className={cn(
            'flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 font-mono text-[11px] tabular-nums transition-colors',
            done
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border-soft text-muted hover:border-accent/40 hover:text-accent',
          )}
        >
          {done ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Plus className="size-3" aria-hidden />
          )}
          {done ? 'Feito' : amount(habit, habit.step)}
        </button>
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-border-soft"
        role="progressbar"
        aria-label={`Progresso de ${habit.label}`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <ol className="flex gap-1.5" aria-label="Últimos 7 dias">
          {habit.week.map((ok, i) => {
            const day = new Date(today - (habit.week.length - 1 - i) * 86_400_000).getDay()
            const isToday = i === habit.week.length - 1
            return (
              <li key={i} className="flex flex-col items-center gap-0.5" title={DAY_NAMES[day]}>
                <span
                  className={cn(
                    'size-2 rounded-full',
                    ok ? 'bg-accent' : 'bg-border-soft',
                    isToday && 'ring-1 ring-accent/50 ring-offset-1 ring-offset-(--color-surface)',
                  )}
                />
                <span
                  className={cn('text-[9px]', isToday ? 'text-accent' : 'text-muted')}
                  aria-hidden
                >
                  {DAY_INITIALS[day]}
                </span>
                <span className="sr-only">
                  {DAY_NAMES[day]}: {ok ? 'feito' : 'não feito'}
                </span>
              </li>
            )
          })}
        </ol>
        <span className="flex items-center gap-1 text-[11px] text-muted" title="Sequência atual">
          <Flame className={cn('size-3.5', streak > 0 && 'text-accent')} aria-hidden />
          <span className="font-mono tabular-nums">{streak}</span> dia{streak === 1 ? '' : 's'}
        </span>
      </div>
    </Card>
  )
}
