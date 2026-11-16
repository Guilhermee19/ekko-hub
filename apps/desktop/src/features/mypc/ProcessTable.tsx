import { AppWindow, Search } from 'lucide-react'
import { useState } from 'react'
import type { SortBy } from '@/lib/ipc'
import { EmptyState } from '@/ui/data'
import { Button, Segmented } from '@/ui/primitives'
import { filterSort } from './metrics'
import { ProcessRow } from './ProcessRow'
import { useMyPc } from './store'

const SORTS: { value: SortBy; label: string }[] = [
  { value: 'memory', label: 'Memória' },
  { value: 'cpu', label: 'CPU' },
  { value: 'name', label: 'Nome' },
]

/** Rows shown before "Mostrar todos". */
const PAGE = 25

/** Running apps grouped by executable, searchable and sortable, with "Finalizar tarefa". */
export function ProcessTable() {
  const processes = useMyPc((s) => s.processes)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('memory')
  const [open, setOpen] = useState<string | null>(null)
  const [all, setAll] = useState(false)
  const rows = filterSort(processes, query, sortBy)
  const shown = all || query ? rows : rows.slice(0, PAGE)
  const top = rows.reduce((m, g) => Math.max(m, g.memory), 1)

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="label-hud">
          Processos{' '}
          <span className="font-normal text-muted normal-case">
            · {processes.reduce((n, g) => n + g.count, 0)} rodando
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg border border-border-soft bg-base px-2 py-1 focus-within:ring-2 focus-within:ring-accent/60">
            <Search className="size-3.5 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar app"
              aria-label="Buscar processo"
              className="w-28 bg-transparent text-[12px] outline-none placeholder:text-muted"
            />
          </label>
          <Segmented value={sortBy} options={SORTS} onChange={setSortBy} />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title={processes.length === 0 ? 'Lendo os processos…' : 'Nada com esse nome'}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-soft">
          <table className="w-full table-fixed text-left text-[12px]">
            <thead className="bg-surface">
              <tr className="label-hud">
                <th scope="col" className="px-3 py-2 font-normal">
                  App
                </th>
                <th scope="col" className="w-20 px-2 py-2 text-right font-normal">
                  Memória
                </th>
                <th scope="col" className="w-14 px-2 py-2 text-right font-normal">
                  CPU
                </th>
                <th scope="col" className="w-24 px-2 py-2 font-normal">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g) => (
                <ProcessRow
                  key={g.name.toLowerCase()}
                  group={g}
                  top={top}
                  open={open === g.name}
                  onToggle={() => setOpen((o) => (o === g.name ? null : g.name))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!all && !query && rows.length > PAGE && (
        <Button variant="ghost" size="sm" className="self-center" onClick={() => setAll(true)}>
          Mostrar todos ({rows.length})
        </Button>
      )}
    </section>
  )
}
