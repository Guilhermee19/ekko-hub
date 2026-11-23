import { X } from 'lucide-react'
import { useState } from 'react'
import { backend, type PickedColor } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'

interface Props {
  colors: PickedColor[]
  selected: string
  onSelect: (hex: string) => void
}

/** Saved and picked colors, newest first: click loads one into the panel. */
export function SavedColors({ colors, selected, onSelect }: Props) {
  // Two-step clear so a stray click doesn't wipe them (same as Copiados).
  const [confirming, setConfirming] = useState(false)
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="label-hud">Salvas · {colors.length}/16</span>
        {colors.length > 0 && !confirming && (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Limpar
          </Button>
        )}
      </div>
      {confirming && (
        <div
          role="alertdialog"
          aria-label="Confirmar limpeza"
          className="animate-rise-in flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-2.5 text-[12px]"
        >
          <span>Apagar as {colors.length} cores salvas?</span>
          <div className="flex gap-1.5">
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
        </div>
      )}
      {colors.length === 0 ? (
        <p className="text-[12px] text-muted">
          Nenhuma cor ainda. Escolha uma no painel e clique em Salvar cor, ou pegue da tela.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
          {colors.map((c) => (
            <li key={c.hex} className="group relative">
              <button
                type="button"
                title={`${c.hex.toUpperCase()} · ${c.rgb}\nClique para editar`}
                aria-label={`Abrir ${c.hex.toUpperCase()}`}
                aria-pressed={c.hex === selected}
                onClick={() => onSelect(c.hex)}
                className={cn(
                  'block aspect-square w-full rounded-lg border border-white/10 shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
                  c.hex === selected && 'ring-2 ring-accent',
                )}
                style={{ background: c.hex }}
              />
              <button
                type="button"
                aria-label={`Tirar ${c.hex.toUpperCase()} das salvas`}
                onClick={() => void backend.colorRemove(c.hex)}
                className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-base text-muted group-focus-within:grid group-hover:grid hover:text-content"
              >
                <X className="size-2.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
