import { Copy, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, IconButton, Slider } from '@/ui/primitives'
import { CodeInput } from './CodeInput'
import { formats, type Parsed, variations } from './palette'
import { copyColor } from './store'

/** Checkerboard behind see-through colors (tokens, so it follows the theme). */
export const CHECKER = {
  backgroundImage:
    'repeating-conic-gradient(var(--color-surface-hover) 0% 25%, var(--color-base) 0% 50%)',
  backgroundSize: '12px 12px',
}

interface Props {
  hex: string
  opacity: number
  onOpacity: (v: number) => void
  onChange: (hex: string) => void
  /** A typed or pasted code (its alpha sets the opacity). */
  onCode: (color: Parsed) => void
  onSave: () => void
  saved: boolean
}

/** The chosen color: preview, codes to copy or paste, opacity, save, and variations. */
export function CurrentColor({ hex, opacity, onOpacity, onChange, onCode, onSave, saved }: Props) {
  const codes = formats(hex, opacity)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <div
          className="size-20 shrink-0 overflow-hidden rounded-xl border border-border-soft"
          style={CHECKER}
        >
          <div className="size-full" style={{ background: hex, opacity: opacity / 100 }} />
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-1">
          {Object.entries(codes).map(([kind, text]) => (
            <li key={kind} className="flex items-center gap-1">
              <span className="w-8 text-[10px] text-muted uppercase">{kind}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{text}</code>
              <IconButton
                label={`Copiar ${text}`}
                onClick={() => copyColor(text)}
                className="size-6"
              >
                <Copy className="size-3" />
              </IconButton>
            </li>
          ))}
        </ul>
      </div>

      <CodeInput hex={hex} onColor={onCode} />

      <div className="flex items-center gap-3">
        <span className="label-hud w-20">Opacidade</span>
        <Slider label="Opacidade" value={opacity} min={0} max={100} onChange={onOpacity} />
        <span className="w-10 text-right font-mono text-[11px] text-muted tabular-nums">
          {opacity}%
        </span>
      </div>

      <Button variant="subtle" onClick={onSave} disabled={saved} className="self-start">
        <Plus className="size-3.5" />
        {saved ? 'Já está nas salvas' : 'Salvar cor'}
      </Button>

      <div className="flex flex-col gap-1.5">
        <span className="label-hud">Variações</span>
        <div className="flex overflow-hidden rounded-lg border border-border-soft">
          {variations(hex).map((v) => (
            <button
              key={v}
              type="button"
              title={v.toUpperCase()}
              aria-label={`Usar ${v.toUpperCase()}`}
              onClick={() => onChange(v)}
              className={cn(
                'h-8 flex-1 transition-transform hover:z-10 hover:scale-y-110 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent',
                v === hex && 'z-10 ring-2 ring-white ring-inset',
              )}
              style={{ background: v }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
