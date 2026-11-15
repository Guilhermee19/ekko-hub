import { NotebookPen, Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge, EmptyState } from '@/ui/data'
import { Input } from '@/ui/forms'
import { filterNotes, useMemory } from './store'

const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

export function NotesTab({ compact }: { compact: boolean }) {
  const notes = useMemory((s) => s.notes)
  const [query, setQuery] = useState('')
  const shown = filterNotes(notes, query)
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nas notas"
          aria-label="Buscar nas notas"
          className="pl-8"
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={query ? 'Nada encontrado' : 'Sem notas'}
          hint={query ? 'Tente outra palavra ou uma tag.' : 'Peça “anota isso” durante a conversa.'}
        />
      ) : (
        <ul className={cn('grid gap-2', !compact && 'grid-cols-2')}>
          {shown.map((n) => (
            <li
              key={n.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border-soft bg-surface p-3 transition-colors hover:border-accent/30 hover:bg-surface-hover"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate text-[13px] font-semibold">{n.title}</h3>
                <time
                  dateTime={n.date}
                  className="shrink-0 font-mono text-[11px] text-muted tabular-nums"
                >
                  {DATE.format(new Date(`${n.date}T12:00:00`))}
                </time>
              </div>
              <p className="line-clamp-2 text-[12px] text-muted">{n.excerpt}</p>
              <div className="flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <Badge key={t} tone="accent">
                    #{t}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
