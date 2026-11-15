import { ChevronDown, ListTodo, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState, PageHeader } from '@/ui/data'
import { IconButton } from '@/ui/primitives'
import { endOfDay, isDueToday } from './due'
import { RemindersCard } from './RemindersCard'
import { useTasks, type Priority, type Task } from './store'
import { TaskRow } from './TaskRow'

type Filter = 'today' | 'Trabalho' | 'Casa' | 'all'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'Trabalho', label: 'Trabalho' },
  { value: 'Casa', label: 'Casa' },
  { value: 'all', label: 'Todas' },
]

const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

function matches(task: Task, filter: Filter, now: number): boolean {
  if (filter === 'all') return true
  if (filter === 'today') return isDueToday(task.due, now)
  return task.list === filter
}

/** Earliest due first (overdue on top), undated last, then priority. */
function byUrgency(a: Task, b: Task): number {
  const da = a.due ?? Infinity
  const db = b.due ?? Infinity
  return da !== db ? da - db : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
}

export function TasksPage({ compact }: PageProps) {
  const now = useNow(true, 30_000)
  const tasks = useTasks((s) => s.tasks)
  const [filter, setFilter] = useState<Filter>('today')
  const [showDone, setShowDone] = useState(false)

  const visible = tasks.filter((t) => matches(t, filter, now))
  const open = visible.filter((t) => !t.done).sort(byUrgency)
  const done = visible.filter((t) => t.done)
  const overdue = open.filter((t) => t.due !== undefined && t.due < now).length
  const showList = filter === 'today' || filter === 'all'

  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="Tarefas e Lembretes"
        hint={`${open.length} pendente${open.length === 1 ? '' : 's'}${overdue ? ` · ${overdue} atrasada${overdue === 1 ? '' : 's'}` : ''}`}
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Listas">
        {FILTERS.map((f) => {
          const count = tasks.filter((t) => !t.done && matches(t, f.value, now)).length
          const active = f.value === filter
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors',
                active
                  ? 'border-accent/40 bg-accent/12 text-accent'
                  : 'border-border-soft text-muted hover:border-accent/30 hover:text-content',
              )}
            >
              {f.label}
              <span className="font-mono text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      <div
        className={cn(
          'grid items-start gap-3',
          compact ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_200px]',
        )}
      >
        <section className="flex min-w-0 flex-col gap-2">
          <AddTask filter={filter} now={now} />
          {open.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="Tudo em dia"
              hint="Nenhuma tarefa pendente nesta lista."
            />
          ) : (
            <ul className="-mx-2 flex flex-col">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} now={now} showList={showList} />
              ))}
            </ul>
          )}

          {done.length > 0 && (
            <div className="border-t border-border-soft pt-2">
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((v) => !v)}
                className="flex items-center gap-1.5 text-[12px] text-muted hover:text-content"
              >
                <ChevronDown
                  className={cn('size-3.5 transition-transform', !showDone && '-rotate-90')}
                  aria-hidden
                />
                Concluídas <span className="font-mono tabular-nums">({done.length})</span>
              </button>
              {showDone && (
                <ul className="-mx-2 mt-1 flex flex-col">
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} now={now} showList={showList} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <RemindersCard now={now} />
      </div>
    </div>
  )
}

/** Enter adds to the current list; under "Hoje" the task is due by end of day. */
function AddTask({ filter, now }: { filter: Filter; now: number }) {
  const add = useTasks((s) => s.add)
  const [title, setTitle] = useState('')

  const submit = () => {
    if (!title.trim()) return
    const list = filter === 'Trabalho' || filter === 'Casa' ? filter : 'Pessoal'
    add({ title, list, due: filter === 'today' ? endOfDay(now) : undefined })
    setTitle('')
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-base/60 py-1 pr-1 pl-3 focus-within:border-accent/50">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        aria-label="Nova tarefa"
        placeholder="Adicionar tarefa… (Enter)"
        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
      />
      <IconButton
        label="Adicionar tarefa"
        onClick={submit}
        disabled={!title.trim()}
        className="size-7 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </IconButton>
    </div>
  )
}
