import { Plus, Workflow } from 'lucide-react'
import { useState } from 'react'
import type { PageProps } from '@/surfaces/panel/pages'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState, PageHeader } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { RoutineCard } from './RoutineCard'
import { RoutineEditor } from './RoutineEditor'
import { useRoutines } from './store'

/** `editing`: a routine id, 'new', or null for the list. */
export function RoutinesPage({ compact }: PageProps) {
  const routines = useRoutines((s) => s.routines)
  const [editing, setEditing] = useState<string | null>(null)
  // "hoje"/"ontem" labels only need a slow refresh.
  const now = useNow(editing === null, 60_000)

  if (editing !== null) {
    const routine = routines.find((r) => r.id === editing)
    return (
      <RoutineEditor
        key={editing}
        routine={routine}
        compact={compact}
        onClose={() => setEditing(null)}
      />
    )
  }

  const active = routines.filter((r) => r.enabled).length
  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="Rotinas"
        hint={`${active} de ${routines.length} ativas · gatilho → ações`}
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="size-3.5" /> {compact ? 'Nova' : 'Nova rotina'}
          </Button>
        }
      />
      {routines.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Nenhuma rotina"
          hint="Junte várias ações num gatilho: um horário, uma frase ou um evento do PC."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {routines.map((r) => (
            <RoutineCard key={r.id} routine={r} now={now} onEdit={() => setEditing(r.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}
