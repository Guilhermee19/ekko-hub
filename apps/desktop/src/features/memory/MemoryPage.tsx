import { Lock } from 'lucide-react'
import type { PageProps } from '@/surfaces/panel/pages'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/ui/data'
import { Toggle } from '@/ui/forms'
import { Segmented } from '@/ui/primitives'
import { FactsTab } from './FactsTab'
import { MemoryMap } from './MemoryMap'
import { NotesTab } from './NotesTab'
import { useMemory, type MemoryTab } from './store'

const TABS: { value: MemoryTab; label: string }[] = [
  { value: 'facts', label: 'Fatos' },
  { value: 'notes', label: 'Notas' },
  { value: 'map', label: 'Mapa' },
]

/** Memória: what Ekko learned about the user (mock data until the memory backend). */
export function MemoryPage({ compact }: Pick<PageProps, 'compact'>) {
  const tab = useMemory((s) => s.tab)
  const count = useMemory((s) => s.facts.length)
  const paused = useMemory((s) => s.paused)
  const { setTab, setPaused } = useMemory.getState()

  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <PageHeader
        title="Memória"
        hint={
          paused
            ? 'Pausada: não estou guardando nada novo'
            : `${count} coisas que aprendi sobre você`
        }
        actions={!compact && <Segmented value={tab} options={TABS} onChange={setTab} />}
      />
      {compact && (
        <div className="-mt-2">
          <Segmented value={tab} options={TABS} onChange={setTab} />
        </div>
      )}

      <div className={cn('transition-opacity', paused && 'opacity-70')}>
        {tab === 'facts' && <FactsTab />}
        {tab === 'notes' && <NotesTab compact={compact} />}
        {tab === 'map' && <MemoryMap />}
      </div>

      <footer className="flex items-center gap-3 rounded-xl border border-border-soft bg-base/60 px-3 py-2.5">
        <Lock className="size-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium">Tudo fica só no seu PC</div>
          <div className="text-[11px] text-muted">
            Nada vai para a nuvem. Você pode apagar quando quiser.
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-muted">Pausar memória</span>
        <Toggle checked={paused} label="Pausar memória" onChange={setPaused} />
      </footer>
    </div>
  )
}
