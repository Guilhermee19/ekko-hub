import { ChevronDown, Repeat as RepeatIcon, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Check } from '@/ui/forms'
import { formatDue } from './due'
import { useTasks, type Priority, type Repeat, type Task } from './store'

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-danger',
  normal: 'bg-accent',
  low: 'bg-muted/60',
}

const PRIORITY_LABEL: Record<Priority, string> = { high: 'Alta', normal: 'Normal', low: 'Baixa' }

export const REPEAT_LABEL: Record<Repeat, string> = {
  daily: 'Todo dia',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
}

/** One task: check, title, meta line (priority, list, due, repeat) and expandable subtasks. */
export function TaskRow({ task, now, showList }: { task: Task; now: number; showList: boolean }) {
  const [open, setOpen] = useState(false)
  const toggle = useTasks((s) => s.toggle)
  const remove = useTasks((s) => s.remove)
  const toggleSubtask = useTasks((s) => s.toggleSubtask)
  const due = task.due !== undefined && !task.done ? formatDue(task.due, now) : null
  const subDone = task.subtasks.filter((s) => s.done).length
  const hasSubs = task.subtasks.length > 0

  return (
    <li className="group animate-rise-in rounded-lg transition-colors hover:bg-surface-hover">
      <div className="flex items-start gap-2.5 px-2 py-2">
        <span className="pt-px">
          <Check
            checked={task.done}
            label={`Concluir ${task.title}`}
            onChange={() => toggle(task.id)}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-[13px]', task.done && 'text-muted line-through')}>
            {task.title}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span
              className="flex items-center gap-1"
              title={`Prioridade ${PRIORITY_LABEL[task.priority].toLowerCase()}`}
            >
              <span
                className={cn('size-1.5 rounded-full', PRIORITY_DOT[task.priority])}
                aria-hidden
              />
              {task.priority === 'high' && !task.done ? (
                <Badge tone="danger">Alta</Badge>
              ) : (
                <span className="sr-only">Prioridade {PRIORITY_LABEL[task.priority]}</span>
              )}
            </span>
            {showList && <span>{task.list}</span>}
            {due && (
              <span
                className={cn(
                  'font-mono tabular-nums',
                  due.overdue ? 'text-danger' : 'text-content/80',
                )}
              >
                {due.text}
              </span>
            )}
            {task.repeat && (
              <span className="flex items-center gap-1" title={REPEAT_LABEL[task.repeat]}>
                <RepeatIcon className="size-3" aria-hidden />
                <span className="sr-only">{REPEAT_LABEL[task.repeat]}</span>
              </span>
            )}
            {hasSubs && (
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${open ? 'Ocultar' : 'Mostrar'} subtarefas (${subDone} de ${task.subtasks.length})`}
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 rounded px-1 font-mono tabular-nums hover:text-accent"
              >
                {subDone}/{task.subtasks.length}
                <ChevronDown
                  className={cn('size-3 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Excluir ${task.title}`}
          title="Excluir"
          onClick={() => remove(task.id)}
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {hasSubs && open && (
        <ul className="animate-rise-in ml-[30px] flex flex-col gap-1.5 border-l border-border-soft pb-2 pl-3">
          {task.subtasks.map((st) => (
            <li key={st.id} className="flex items-center gap-2 text-[12px]">
              <Check
                checked={st.done}
                label={`Concluir ${st.title}`}
                onChange={() => toggleSubtask(task.id, st.id)}
              />
              <span className={cn(st.done && 'text-muted line-through')}>{st.title}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
