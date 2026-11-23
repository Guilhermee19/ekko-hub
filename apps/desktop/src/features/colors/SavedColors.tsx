import { Pin, X } from 'lucide-react'
import { useState } from 'react'
import { backend, type PickedColor } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'

/** Unpinned colors kept (HISTORY_MAX in ekko-core/colors.rs). */
const RECENT_MAX = 32

interface Props {
  colors: PickedColor[]
  selected: string
  onSelect: (hex: string) => void
}

/** Pinned colors first, then the recent ones, newest first: click loads one into the panel. */
export function SavedColors({ colors, selected, onSelect }: Props) {
  const pinned = colors.filter((c) => c.pinned)
  const recent = colors.filter((c) => !c.pinned)
  return (
    <div className="flex flex-col gap-4">
      {pinned.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="label-hud">Fixadas · {pinned.length}</span>
          <Swatches colors={pinned} selected={selected} onSelect={onSelect} />
        </section>
      )}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="label-hud">
            Recentes · {recent.length}/{RECENT_MAX}
          </span>
          {recent.length > 0 && <ClearRecent count={recent.length} />}
        </div>
        {recent.length === 0 ? (
          <p className="text-[12px] text-muted">
            {colors.length === 0
              ? 'Nenhuma cor ainda. Escolha uma no painel e clique em Salvar cor, ou pegue da tela.'
              : 'Nada recente. As fixadas ficam guardadas mesmo quando o histórico enche.'}
          </p>
        ) : (
          <Swatches colors={recent} selected={selected} onSelect={onSelect} />
        )}
      </section>
    </div>
  )
}

function Swatches({ colors, selected, onSelect }: Props) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
      {colors.map((c) => (
        <Swatch key={c.hex} color={c} selected={c.hex === selected} onSelect={onSelect} />
      ))}
    </ul>
  )
}

const CORNER =
  'absolute size-4.5 place-items-center rounded-full bg-base text-muted hover:text-content focus-visible:grid focus-visible:outline-2 focus-visible:outline-accent'

function Swatch({
  color: c,
  selected,
  onSelect,
}: {
  color: PickedColor
  selected: boolean
  onSelect: (hex: string) => void
}) {
  const name = c.hex.toUpperCase()
  return (
    <li className="group relative">
      <button
        type="button"
        title={`${name} · ${c.rgb}\nClique para editar`}
        aria-label={`Abrir ${name}`}
        aria-pressed={selected}
        onClick={() => onSelect(c.hex)}
        className={cn(
          'block aspect-square w-full rounded-lg border border-white/10 shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
          selected && 'ring-2 ring-accent',
        )}
        style={{ background: c.hex }}
      />
      <button
        type="button"
        aria-label={c.pinned ? `Desafixar ${name}` : `Fixar ${name}`}
        title={c.pinned ? 'Desafixar' : 'Fixar: não sai do histórico'}
        onClick={() => void backend.colorPin(c.hex, !c.pinned)}
        className={cn(
          CORNER,
          '-top-1.5 -left-1.5',
          c.pinned ? 'grid text-accent' : 'hidden group-hover:grid',
        )}
      >
        <Pin className={cn('size-2.5', c.pinned && 'fill-current')} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Tirar ${name} das salvas`}
        title="Remover"
        onClick={() => void backend.colorRemove(c.hex)}
        className={cn(CORNER, '-top-1.5 -right-1.5 hidden group-hover:grid')}
      >
        <X className="size-2.5" aria-hidden />
      </button>
    </li>
  )
}

/** Two-step clear so a stray click doesn't wipe them (same as Copiados). */
function ClearRecent({ count }: { count: number }) {
  const [confirming, setConfirming] = useState(false)
  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        Limpar recentes
      </Button>
    )
  }
  return (
    <div role="alertdialog" aria-label="Confirmar limpeza" className="flex items-center gap-1.5">
      <span className="text-[12px]">
        Apagar {count} {count === 1 ? 'cor' : 'cores'}? As fixadas ficam.
      </span>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      <Button
        size="sm"
        variant="danger"
        autoFocus
        onClick={() => {
          void backend.colorClear()
          setConfirming(false)
        }}
      >
        Limpar
      </Button>
    </div>
  )
}
