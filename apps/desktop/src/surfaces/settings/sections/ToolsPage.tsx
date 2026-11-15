import { Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/ui/data'
import { Input } from '@/ui/forms'
import { Segmented } from '@/ui/primitives'
import { Field } from '../Field'
import { usePrefsSystem } from './prefsSystem'
import { Chip, PageTitle } from './systemUi'
import { TOOLS } from './toolsCatalog'
import { ToolsCard } from './ToolsCard'
import { AUTONOMY_HINT, CATEGORY_LABEL, filterTools, type ToolCategory } from './toolsModel'

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ToolCategory[]

export function ToolsPage() {
  const autonomy = usePrefsSystem((s) => s.autonomy)
  const setAutonomy = usePrefsSystem((s) => s.setAutonomy)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ToolCategory | 'all'>('all')

  const visible = useMemo(() => filterTools(TOOLS, query, category), [query, category])
  const groups = CATEGORIES.map((c) => ({
    c,
    tools: visible.filter((t) => t.category === c),
  })).filter((g) => g.tools.length > 0)

  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <PageTitle
        title="Funções e autonomia"
        subtitle="O que o Ekko sabe fazer e quando ele pede sua permissão."
      />

      <Field
        title="Nível de autonomia"
        hint="Ações perigosas sempre pedem confirmação, e tudo vai para o log de auditoria."
      >
        <Segmented
          value={autonomy}
          options={[
            { value: 'ask', label: 'Sempre perguntar' },
            { value: 'balanced', label: 'Equilibrado' },
            { value: 'auto', label: 'Autônomo' },
          ]}
          onChange={setAutonomy}
        />
        <p className="mt-2 text-[12px] text-muted" aria-live="polite">
          {AUTONOMY_HINT[autonomy]}
        </p>
      </Field>

      <Field
        title="Catálogo de funções"
        hint="Desative o que não quer usar ou mude quando cada uma pede confirmação."
      >
        <div className="mb-4 flex flex-col gap-3">
          <div className="relative max-w-sm">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
            />
            <Input
              type="search"
              aria-label="Buscar função"
              placeholder="Buscar função ou frase…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoria">
            <Chip active={category === 'all'} onClick={() => setCategory('all')}>
              Todas
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nenhuma função encontrada"
            hint="Tente outra palavra."
          />
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(({ c, tools }) => (
              <section key={c} aria-label={CATEGORY_LABEL[c]}>
                <h3 className="label-hud mb-2">
                  {CATEGORY_LABEL[c]} · {tools.length}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map(({ icon, ...tool }) => (
                    <ToolsCard key={tool.id} tool={tool} icon={icon} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Field>
    </div>
  )
}
