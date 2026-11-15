import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { PageHeader } from '@/ui/data'
import { BreakTip } from './BreakTip'
import { HabitRow } from './HabitRow'
import { useHabits } from './store'
import { WaterCard } from './WaterCard'

export function HabitsPage({ compact }: PageProps) {
  const habits = useHabits((s) => s.habits)
  const today = useNow(true, 60_000)
  const done = habits.filter((h) => h.progress >= h.target).length

  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader title="Hábitos" hint={`${done} de ${habits.length} concluídos hoje`} />
      <div
        className={cn(
          'grid items-stretch gap-3',
          compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_180px]',
        )}
      >
        <WaterCard />
        <BreakTip />
      </div>
      <section className="flex flex-col gap-2">
        <span className="label-hud">Hoje</span>
        <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} today={today} />
          ))}
        </div>
      </section>
    </div>
  )
}
