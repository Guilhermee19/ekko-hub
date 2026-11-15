import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { useMemory, type Fact } from './store'

type Mode = 'view' | 'edit' | 'confirm'

/** One remembered fact with inline edit and a confirm step before forgetting. */
export function FactRow({ fact }: { fact: Fact }) {
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState(fact.text)
  const { updateFact, forgetFact } = useMemory.getState()

  const startEdit = () => {
    setDraft(fact.text)
    setMode('edit')
  }
  const save = () => {
    updateFact(fact.id, draft)
    setMode('view')
  }

  if (mode === 'edit') {
    return (
      <li className="flex items-center gap-1.5 px-3 py-2">
        <Input
          autoFocus
          value={draft}
          aria-label="Editar lembrança"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') setMode('view')
          }}
        />
        <IconButton
          label="Salvar"
          tone="accent"
          onClick={save}
          disabled={!draft.trim()}
          className="size-7"
        >
          <Check className="size-3.5" />
        </IconButton>
        <IconButton label="Cancelar" onClick={() => setMode('view')} className="size-7">
          <X className="size-3.5" />
        </IconButton>
      </li>
    )
  }

  return (
    <li className="group flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">{fact.text}</div>
        <div className="truncate text-[11px] text-muted">{fact.source}</div>
      </div>
      {mode === 'confirm' ? (
        <div
          className="animate-rise-in flex shrink-0 items-center gap-1"
          role="group"
          aria-label="Confirmar esquecer"
        >
          <Button
            variant="danger"
            className="px-2 py-1 text-[12px]"
            onClick={() => forgetFact(fact.id)}
          >
            Esquecer?
          </Button>
          <IconButton label="Cancelar" onClick={() => setMode('view')} className="size-7">
            <X className="size-3.5" />
          </IconButton>
        </div>
      ) : (
        <div className="flex shrink-0 items-center opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <IconButton label={`Editar: ${fact.text}`} onClick={startEdit} className="size-7">
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton
            label={`Esquecer: ${fact.text}`}
            onClick={() => setMode('confirm')}
            className="size-7"
          >
            <Trash2 className="size-3.5" />
          </IconButton>
        </div>
      )}
    </li>
  )
}
