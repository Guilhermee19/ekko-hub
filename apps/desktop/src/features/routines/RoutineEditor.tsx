import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { FlowChips } from './Chips'
import { defaultTrigger, type Routine } from './model'
import { StepsEditor } from './StepsEditor'
import { useRoutines } from './store'
import { TriggerEditor } from './TriggerEditor'

interface RoutineEditorProps {
  /** Existing routine, or undefined to create one. */
  routine?: Routine
  compact: boolean
  onClose: () => void
}

const blank = (): Routine => ({
  id: crypto.randomUUID(),
  name: '',
  trigger: defaultTrigger('time'),
  steps: [],
  enabled: true,
  lastRunAt: null,
})

/** Mock builder: edits a local draft and only writes to the store on "Salvar". */
export function RoutineEditor({ routine, compact, onClose }: RoutineEditorProps) {
  const save = useRoutines((s) => s.save)
  const remove = useRoutines((s) => s.remove)
  const [draft, setDraft] = useState<Routine>(() => routine ?? blank())
  const patch = (p: Partial<Routine>) => setDraft((d) => ({ ...d, ...p }))
  const valid = draft.name.trim() !== '' && draft.steps.length > 0

  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <header className="flex items-center gap-2">
        <IconButton label="Voltar para rotinas" onClick={onClose}>
          <ArrowLeft className="size-4" />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[18px] font-semibold">
          {routine ? 'Editar rotina' : 'Nova rotina'}
        </h1>
        {routine && (
          <IconButton
            label="Apagar rotina"
            tone="danger"
            onClick={() => {
              remove(routine.id)
              onClose()
            }}
          >
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </header>

      <Input
        aria-label="Nome da rotina"
        placeholder="Nome da rotina (ex.: Bom dia)"
        value={draft.name}
        autoFocus={!routine}
        onChange={(e) => patch({ name: e.target.value })}
      />

      <section className="flex flex-col gap-2">
        <span className="label-hud">1 · Quando</span>
        <TriggerEditor value={draft.trigger} onChange={(trigger) => patch({ trigger })} />
      </section>

      <section className="flex flex-col gap-2">
        <span className="label-hud">2 · Faça</span>
        <StepsEditor steps={draft.steps} compact={compact} onChange={(steps) => patch({ steps })} />
      </section>

      <section className="flex flex-col gap-1.5 rounded-xl border border-border-soft bg-surface p-3">
        <span className="label-hud">Prévia</span>
        <FlowChips trigger={draft.trigger} steps={draft.steps} />
      </section>

      <footer className="flex items-center justify-end gap-2">
        {!valid && (
          <span className="mr-auto text-[11px] text-muted">Dê um nome e adicione uma ação.</span>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            save({ ...draft, name: draft.name.trim() })
            onClose()
          }}
        >
          Salvar
        </Button>
      </footer>
    </div>
  )
}
