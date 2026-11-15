import { Search } from 'lucide-react'
import { useState } from 'react'
import type { PageProps } from '@/surfaces/panel/pages'
import { PageHeader } from '@/ui/data'
import { Input } from '@/ui/forms'
import { Segmented } from '@/ui/primitives'
import { HistoryTab } from './HistoryTab'
import { SnippetsTab } from './SnippetsTab'
import { useClipboard } from './store'

type Tab = 'history' | 'snippets'

const TABS: { value: Tab; label: string }[] = [
  { value: 'history', label: 'Histórico' },
  { value: 'snippets', label: 'Snippets' },
]

export function ClipboardPage({ compact }: PageProps) {
  const [tab, setTab] = useState<Tab>('history')
  const [query, setQuery] = useState('')
  const count = useClipboard((s) => (tab === 'history' ? s.clips.length : s.snippets.length))
  const history = tab === 'history'
  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="Copiados"
        hint={compact ? undefined : 'Histórico da área de transferência e textos prontos.'}
        actions={<Segmented value={tab} onChange={setTab} options={TABS} />}
      />
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
        />
        <Input
          type="search"
          aria-label={history ? 'Buscar no histórico' : 'Buscar snippets'}
          placeholder={history ? 'Buscar no histórico…' : 'Buscar snippets…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pr-10 pl-8"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] text-muted tabular-nums">
          {count}
        </span>
      </div>
      {history ? <HistoryTab query={query} /> : <SnippetsTab query={query} />}
    </div>
  )
}
