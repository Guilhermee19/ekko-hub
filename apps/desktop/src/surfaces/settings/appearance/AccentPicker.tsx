import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { Input } from '@/ui/forms'
import { Button } from '@/ui/primitives'
import { MIN_ACCENT_CONTRAST, normalizeHex } from '@/theme/color'
import { accentContrast, effectiveAccent } from '@/theme/applyAppearance'
import { setAppearance, useAppearance } from './controls'

/** Ready-made accents; the value is user data, not a UI color. */
const PRESETS = [
  { hex: '#5ec8ff', label: 'Ciano' },
  { hex: '#3fe0c5', label: 'Verde-água' },
  { hex: '#7cf27c', label: 'Verde' },
  { hex: '#ffd23f', label: 'Amarelo' },
  { hex: '#ff9c3f', label: 'Âmbar' },
  { hex: '#ff5f7e', label: 'Rosa' },
  { hex: '#c084fc', label: 'Lilás' },
  { hex: '#8f9bff', label: 'Índigo' },
  { hex: '#e6edf3', label: 'Gelo' },
]

/** Custom accent: native picker, presets, hex field, reset and a live contrast badge. */
export function AccentPicker() {
  const look = useAppearance()
  const persona = useSettings((s) => s.settings.persona)
  const current = effectiveAccent(persona, look)
  const ratio = accentContrast(persona, look)
  const pick = (hex: string) => setAppearance({ accent: normalizeHex(hex) })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cores prontas">
        {PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            title={p.label}
            aria-label={p.label}
            aria-pressed={current === p.hex}
            onClick={() => pick(p.hex)}
            className={cn(
              'size-7 rounded-full border-2 transition-transform hover:scale-110',
              'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
              current === p.hex ? 'border-content' : 'border-transparent',
            )}
            style={{ background: p.hex }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-soft">
          <span className="sr-only">Escolher cor</span>
          <input
            type="color"
            value={current}
            onChange={(e) => pick(e.target.value)}
            className="absolute -inset-2 size-[calc(100%+1rem)] cursor-pointer"
          />
        </label>
        <div className="w-32">
          <Input
            key={current}
            aria-label="Cor em hexadecimal"
            defaultValue={current}
            maxLength={7}
            spellCheck={false}
            className="font-mono"
            onBlur={(e) => normalizeHex(e.target.value) && pick(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </div>
        <ContrastBadge ratio={ratio} />
        <Button
          variant="subtle"
          disabled={look.accent === null}
          onClick={() => setAppearance({ accent: null })}
          className="ml-auto"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Voltar ao padrão da persona
        </Button>
      </div>
    </div>
  )
}

function ContrastBadge({ ratio }: { ratio: number }) {
  const ok = ratio >= MIN_ACCENT_CONTRAST
  return (
    <span
      role="status"
      title="Contraste do accent sobre o fundo (mínimo recomendado 3:1)"
      className={cn(
        'rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums',
        ok ? 'border-accent/30 text-accent' : 'border-danger/40 text-danger',
      )}
    >
      {ratio.toFixed(1)}:1 · {ok ? 'legível' : 'escuro demais'}
    </span>
  )
}
