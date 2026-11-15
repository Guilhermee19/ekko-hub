import { ClipboardX } from 'lucide-react'
import { useState } from 'react'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { ClipItem } from './ClipItem'
import { matches, sortClips } from './filter'
import { useClipboard } from './store'

export function HistoryTab({ query }: { query: string }) {
  const clips = useClipboard((s) => s.clips)
  // Refresh "há 2 min" labels twice a minute.
  const now = useNow(true, 30_000)
  const visible = sortClips(clips).filter((c) => matches(query, c.content, c.source))

  if (clips.length === 0) {
    return (
      <EmptyState
        icon={ClipboardX}
        title="Nada copiado ainda"
        hint="O que você copiar aparece aqui."
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardX}
          title="Nada encontrado"
          hint={`Nenhum item com “${query.trim()}”.`}
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((c) => (
            <ClipItem key={c.id} clip={c} now={now} />
          ))}
        </ul>
      )}
      <ClearHistory />
    </div>
  )
}

/** Two-step clear so a stray click doesn't wipe the history. */
function ClearHistory() {
  const clearHistory = useClipboard((s) => s.clearHistory)
  const unpinned = useClipboard((s) => s.clips.filter((c) => !c.pinned).length)
  const [confirming, setConfirming] = useState(false)
  if (unpinned === 0) return null
  if (!confirming) {
    return (
      <Button
        variant="ghost"
        className="self-center text-[12px]"
        onClick={() => setConfirming(true)}
      >
        Limpar histórico
      </Button>
    )
  }
  return (
    <div
      role="alertdialog"
      aria-label="Confirmar limpeza"
      className="animate-rise-in flex flex-wrap items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-2.5 text-[12px]"
    >
      <span className="text-content">
        Apagar <span className="font-mono tabular-nums">{unpinned}</span>{' '}
        {unpinned === 1 ? 'item' : 'itens'}? Os fixados ficam.
      </span>
      <div className="flex gap-1.5">
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          autoFocus
          onClick={() => {
            clearHistory()
            setConfirming(false)
          }}
        >
          Limpar
        </Button>
      </div>
    </div>
  )
}
