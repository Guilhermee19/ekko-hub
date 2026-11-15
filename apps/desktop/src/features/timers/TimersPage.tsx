import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { PageHeader } from '@/ui/data'
import { PomodoroCard } from './PomodoroCard'
import { StopwatchCard } from './StopwatchCard'
import { useTimers } from './store'
import { TimerList } from './TimerList'

export function TimersPage({ compact }: PageProps) {
  const running = useTimers((s) => s.timers.filter((t) => t.pausedLeft === undefined).length)
  const now = useNow(running > 0, 250)

  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="Timers e Foco"
        hint={
          running ? `${running} timer${running === 1 ? '' : 's'} correndo` : 'Nenhum timer correndo'
        }
      />
      <TimerList now={now} compact={compact} />
      <div className={cn('grid items-start gap-3', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <PomodoroCard />
        <StopwatchCard />
      </div>
    </div>
  )
}
