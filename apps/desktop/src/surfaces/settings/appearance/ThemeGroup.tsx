import { backend, type Persona } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { PALETTES } from '@/theme/palettes'
import { Field } from '../Field'
import { AccentPicker } from './AccentPicker'
import { Group } from './controls'

const PERSONAS: { id: Persona; label: string; hint: string }[] = [
  { id: 'ekko', label: 'Ekko', hint: 'Ciano HUD (padrão)' },
  { id: 'tobby', label: 'Tobby', hint: 'Verde-água, mais calmo' },
  { id: 'ultron', label: 'Ultron', hint: 'Âmbar quente' },
]

/** Persona palette + optional custom accent on top of it. */
export function ThemeGroup() {
  const persona = useSettings((s) => s.settings.persona)
  return (
    <Group title="Tema" hint="A persona define a paleta inteira; a cor de destaque pode ser sua.">
      <Field title="Persona" hint="Troca as cores (e, depois, voz e tom) juntos.">
        <div className="grid grid-cols-3 gap-2">
          {PERSONAS.map((p) => {
            // Swatch shows the persona's own accent, not the current override.
            const color = PALETTES[p.id].accent
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={persona === p.id}
                onClick={() => void backend.setPersona(p.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
                  persona === p.id
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-border-soft hover:border-accent/30',
                )}
              >
                <span
                  className="size-6 shrink-0 rounded-full"
                  style={{ background: color, boxShadow: `0 0 14px ${color}66` }}
                />
                <span>
                  <span className="block text-[13px] font-medium">{p.label}</span>
                  <span className="block text-[11px] text-muted">{p.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field
        title="Cor de destaque"
        hint="Substitui o accent da persona em todas as janelas. O tom forte é calculado sozinho."
      >
        <AccentPicker />
      </Field>
    </Group>
  )
}
