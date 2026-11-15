import { Copy, Pencil, Plus, TextCursorInput, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { matches } from './filter'
import { SnippetForm } from './SnippetForm'
import { useClipboard, type Snippet } from './store'

export function SnippetsTab({ query }: { query: string }) {
  const snippets = useClipboard((s) => s.snippets)
  const saveSnippet = useClipboard((s) => s.saveSnippet)
  // A snippet id, 'new' for the create form, or null.
  const [editing, setEditing] = useState<string | null>(null)
  const visible = snippets.filter((s) => matches(query, s.name, s.shortcut, s.content))
  const close = () => setEditing(null)

  return (
    <div className="flex flex-col gap-2">
      {editing === 'new' ? (
        <SnippetForm
          onCancel={close}
          onSave={(data) => {
            saveSnippet(data)
            close()
          }}
        />
      ) : (
        <Button variant="subtle" className="self-start" onClick={() => setEditing('new')}>
          <Plus className="size-3.5" /> Novo snippet
        </Button>
      )}
      {visible.length === 0 && editing !== 'new' && (
        <EmptyState
          icon={TextCursorInput}
          title={snippets.length === 0 ? 'Nenhum snippet' : 'Nada encontrado'}
          hint="Snippets trocam um atalho como ;email pelo texto completo."
        />
      )}
      <ul className="flex flex-col gap-1.5">
        {visible.map((s) =>
          editing === s.id ? (
            <li key={s.id}>
              <SnippetForm
                initial={s}
                onCancel={close}
                onSave={(data) => {
                  saveSnippet({ id: s.id, ...data })
                  close()
                }}
              />
            </li>
          ) : (
            <SnippetRow key={s.id} snippet={s} onEdit={() => setEditing(s.id)} />
          ),
        )}
      </ul>
    </div>
  )
}

function SnippetRow({ snippet: s, onEdit }: { snippet: Snippet; onEdit: () => void }) {
  const copy = useClipboard((st) => st.copy)
  const removeSnippet = useClipboard((st) => st.removeSnippet)
  return (
    <li className="group flex items-start gap-2.5 rounded-xl border border-border-soft bg-surface p-2.5 transition-colors hover:bg-surface-hover">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{s.name}</span>
          <code className="shrink-0 rounded border border-accent/30 bg-accent/10 px-1.5 font-mono text-[11px] text-accent">
            {s.shortcut}
          </code>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12px] whitespace-pre-line text-muted">
          {s.content}
        </p>
      </div>
      <div className="flex shrink-0 items-center opacity-70 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton label={`Copiar ${s.name}`} onClick={() => copy(s.content)}>
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton label={`Editar ${s.name}`} onClick={onEdit}>
          <Pencil className="size-3.5" />
        </IconButton>
        <IconButton label={`Apagar ${s.name}`} onClick={() => removeSnippet(s.id)}>
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>
    </li>
  )
}
