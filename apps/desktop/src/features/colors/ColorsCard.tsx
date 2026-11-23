import { Pipette, X } from 'lucide-react'
import { useEffect } from 'react'
import { backend } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Kbd } from '@/ui/primitives'
import { copyColor, pickColor, useColors, watchColors } from './store'

/** Swatches shown in the card (the history keeps 32 plus the pinned ones). */
const SHOWN = 12

/** Início card: the last picked colors (click copies the HEX) and the eyedropper. */
export function ColorsCard() {
  useEffect(watchColors, [])
  const colors = useColors((s) => s.colors)
  const combo = useSettings((s) => s.settings.shortcuts.color)
  return (
    <div className="flex h-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border-soft bg-surface p-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Pipette className="size-3.5" aria-hidden />
        <span className="label-hud flex-1">Cores</span>
        <button
          type="button"
          onClick={() => pickColor(350)}
          className="rounded-full bg-surface-hover px-2.5 py-0.5 text-[11px] font-medium text-content transition-colors hover:bg-border-soft focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
        >
          Pegar cor
        </button>
      </div>
      {colors.length === 0 ? (
        <p className="text-[12px] text-muted">
          Aperte <Kbd>{combo.replaceAll('+', ' + ')}</Kbd> e clique em qualquer lugar da tela para
          pegar a cor.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {colors.slice(0, SHOWN).map((c) => (
            <li key={c.hex} className="group relative">
              <button
                type="button"
                title={`${c.hex.toUpperCase()} · ${c.rgb}\nClique para copiar`}
                aria-label={`Copiar ${c.hex.toUpperCase()}`}
                onClick={() => copyColor(c.hex.toUpperCase())}
                className="block size-8 rounded-lg border border-white/10 shadow-sm transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                style={{ background: c.hex }}
              />
              <button
                type="button"
                aria-label={`Tirar ${c.hex.toUpperCase()} do histórico`}
                onClick={() => void backend.colorRemove(c.hex)}
                className="absolute -top-1 -right-1 hidden size-4 place-items-center rounded-full bg-base text-muted group-hover:grid hover:text-content"
              >
                <X className="size-2.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {colors[0] && (
        <p className="mt-auto truncate font-mono text-[11px] text-muted">
          Última: <span className="text-content">{colors[0].hex.toUpperCase()}</span> ·{' '}
          {colors[0].rgb}
        </p>
      )}
    </div>
  )
}
