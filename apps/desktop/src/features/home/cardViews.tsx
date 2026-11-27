import { AlarmClock, Clipboard, Cpu, Droplets, Files, ListChecks, Timer } from 'lucide-react'
import { useEffect, type ComponentType } from 'react'
import { AgendaCard as AgendaView } from '@/features/calendar/AgendaCard'
import { BatteryCard } from '@/features/hud/BatteryCard'
import { ColorsCard } from '@/features/colors/ColorsCard'
import { useClipboard } from '@/features/clipboard/store'
import { useHabits } from '@/features/habits/store'
import { connectSystem, useMyPc } from '@/features/mypc/store'
import { useShelf } from '@/features/shelf/store'
import { formatWhen } from '@/features/tasks/due'
import { useTasks } from '@/features/tasks/store'
import { useTimers } from '@/features/timers/store'
import { WeatherCard } from '@/features/weather/WeatherCard'
import { formatRemaining } from '@/lib/time'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { StatCard } from '@/ui/data'
import type { HomeCardId } from './catalog'
import { NowPlaying } from './HomeWidgets'

export type CardProps = Pick<PageProps, 'go' | 'compact'> & {
  /** Editing the home: cards don't navigate or act. */
  editing: boolean
}

function WaterCard({ go, editing }: CardProps) {
  const water = useHabits((s) => s.water)
  const addWater = useHabits((s) => s.addWater)
  return (
    <div className="relative h-full">
      <StatCard
        icon={Droplets}
        label="Água"
        value={`${water.count}/${water.goal}`}
        sub="copos hoje"
        progress={water.count / water.goal}
        onClick={() => go('habits')}
      />
      {!editing && (
        <button
          type="button"
          aria-label="Bebi um copo"
          title="Bebi um copo"
          onClick={() => addWater(1)}
          className="absolute top-2 right-2 grid size-6 place-items-center rounded-full border border-accent/40 text-[13px] text-accent hover:bg-accent/15"
        >
          +
        </button>
      )}
    </div>
  )
}

function TasksCard({ go }: CardProps) {
  const tasks = useTasks((s) => s.tasks)
  const now = useNow(false)
  const open = tasks.filter((t) => !t.done)
  const overdue = open.filter((t) => t.due !== undefined && t.due < now).length
  return (
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
  )
}

function RemindersCard({ go }: CardProps) {
  const reminders = useTasks((s) => s.reminders)
  const now = useNow(false)
  const next = reminders.filter((r) => r.at > now).sort((a, b) => a.at - b.at)[0]
  return (
    <StatCard
      icon={AlarmClock}
      label="Avisos"
      value={reminders.length}
      sub={next ? `próximo ${formatWhen(next.at, now)}` : 'nada agendado'}
      onClick={() => go('tasks')}
    />
  )
}

function TimersCard({ go }: CardProps) {
  const timers = useTimers((s) => s.timers)
  const running = timers.filter((t) => t.pausedLeft === undefined)
  const now = useNow(running.length > 0)
  const soonest = [...running].sort((a, b) => a.endsAt - b.endsAt)[0]
  return (
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
  )
}

function AgendaCard({ go }: CardProps) {
  return <AgendaView onOpen={() => go('agenda')} />
}

function PcCard({ go }: CardProps) {
  // Live telemetry only while the card is on screen (ref-counted with Meu PC).
  useEffect(() => connectSystem(), [])
  const snapshot = useMyPc((s) => s.snapshot)
  const cpu = snapshot ? Math.round(snapshot.cpu.total) : null
  const mem = snapshot ? Math.round((snapshot.memory.used / snapshot.memory.total) * 100) : null
  return (
    <StatCard
      icon={Cpu}
      label="Meu PC"
      value={cpu === null ? '—' : `${cpu}%`}
      sub={mem === null ? 'carregando…' : `processador · memória ${mem}%`}
      progress={cpu === null ? undefined : cpu / 100}
      onClick={() => go('mypc')}
    />
  )
}

function ClipboardCard({ go }: CardProps) {
  const last = useClipboard((s) => s.clips[0])
  const count = useClipboard((s) => s.clips.length)
  return (
    <StatCard
      icon={Clipboard}
      label="Copiados"
      value={count}
      sub={<span className="line-clamp-1">{last ? last.content : 'nada copiado ainda'}</span>}
      onClick={() => go('clipboard')}
    />
  )
}

function ShelfCard() {
  const count = useShelf((s) => s.items.length)
  return (
    <StatCard
      icon={Files}
      label="Prateleira"
      value={count}
      sub={count ? 'arquivos no notch' : 'solte arquivos no notch'}
    />
  )
}

function MusicCard({ go, compact }: CardProps) {
  return <NowPlaying go={go} compact={compact} />
}

export const CARD_VIEW: Record<HomeCardId, ComponentType<CardProps>> = {
  water: WaterCard,
  tasks: TasksCard,
  reminders: RemindersCard,
  timers: TimersCard,
  agenda: AgendaCard,
  pc: PcCard,
  battery: BatteryCard,
  clipboard: ClipboardCard,
  shelf: ShelfCard,
  music: MusicCard,
  colors: ColorsCard,
  weather: WeatherCard,
}
