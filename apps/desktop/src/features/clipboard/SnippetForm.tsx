import { useState, type FormEvent } from 'react'
import { Input } from '@/ui/forms'
import { Button } from '@/ui/primitives'
import type { Snippet } from './store'

interface SnippetFormProps {
  initial?: Snippet
  onSave: (s: Omit<Snippet, 'id'>) => void
  onCancel: () => void
}

/** Inline create/edit form. Shortcuts always start with ";" so they never clash with real words. */
export function SnippetForm({ initial, onSave, onCancel }: SnippetFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [shortcut, setShortcut] = useState(initial?.shortcut ?? ';')
  const [content, setContent] = useState(initial?.content ?? '')
  const valid = name.trim() !== '' && shortcut.trim().length > 1 && content.trim() !== ''

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const sc = shortcut.trim().replace(/\s+/g, '')
    onSave({ name: name.trim(), shortcut: sc.startsWith(';') ? sc : `;${sc}`, content })
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      className="animate-rise-in flex flex-col gap-2 rounded-xl border border-accent/30 bg-surface p-3"
    >
      <div className="flex gap-2">
        <Input
          aria-label="Nome do snippet"
          placeholder="Nome"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <div className="w-28 shrink-0">
          <Input
            aria-label="Atalho"
            placeholder=";atalho"
            value={shortcut}
            onChange={(e) => setShortcut(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>
      <textarea
        aria-label="Conteúdo"
        placeholder="Texto que será colado"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="scroll-thin w-full resize-y rounded-lg border border-border-soft bg-base/60 px-3 py-1.5 text-[13px] outline-none placeholder:text-muted focus:border-accent/50"
      />
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={!valid}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
