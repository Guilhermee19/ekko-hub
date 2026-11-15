import { Brain, Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/ui/data'
import { Input } from '@/ui/forms'
import { IconButton } from '@/ui/primitives'
import { FactRow } from './FactRow'
import { CATEGORIES, groupFacts, useMemory, type Category } from './store'

export function FactsTab() {
  const facts = useMemory((s) => s.facts)
  const groups = groupFacts(facts)
  return (
    <div className="flex flex-col gap-3">
      <TeachForm />
      {groups.length === 0 && (
        <EmptyState
          icon={Brain}
          title="Nenhuma lembrança ainda"
          hint="Converse comigo ou me ensine algo acima."
        />
      )}
      {groups.map((g) => (
        <section key={g.category}>
          <h2 className="label-hud mb-1.5 flex items-center justify-between">
            {g.category}
            <span className="font-mono tabular-nums">{g.facts.length}</span>
          </h2>
          <ul className="divide-y divide-border-soft overflow-hidden rounded-xl border border-border-soft bg-surface">
            {g.facts.map((f) => (
              <FactRow key={f.id} fact={f} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** "Ensinar algo": free text + category. */
function TeachForm() {
  const [text, setText] = useState('')
  const [category, setCategory] = useState<Category>('Preferências')
  const addFact = useMemory.getState().addFact
  const submit = () => {
    if (!text.trim()) return
    addFact(text, category)
    setText('')
  }
  return (
    <form
      className="flex items-center gap-1.5 rounded-xl border border-border-soft bg-base/60 p-1.5 focus-within:border-accent/50"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ensinar algo… ex.: “Meu time é o Atlético”"
        aria-label="Ensinar algo"
        className="min-w-0 border-transparent bg-transparent focus:border-transparent"
      />
      <select
        value={category}
        aria-label="Categoria"
        onChange={(e) => setCategory(e.target.value as Category)}
        className="shrink-0 rounded-lg border border-border-soft bg-surface px-1.5 py-1 text-[12px] text-muted outline-none focus:border-accent/50"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <IconButton
        label="Ensinar"
        tone="accent"
        type="submit"
        disabled={!text.trim()}
        className="size-7 disabled:opacity-40"
      >
        <Plus className="size-4" />
      </IconButton>
    </form>
  )
}
