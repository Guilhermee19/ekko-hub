import { backend, type Persona } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { Segmented } from '@/ui/primitives'
import { DisplayModePicker } from './DisplayModePicker'
import { Field } from './Field'
import { NotchSettingsPanel } from './NotchSettingsPanel'

const PERSONAS: { id: Persona; label: string; hint: string; color: string }[] = [
  { id: 'ekko', label: 'Ekko', hint: 'Ciano HUD (padrão)', color: '#5ec8ff' },
  { id: 'eco', label: 'Eco', hint: 'Verde-água, mais calmo', color: '#3fe0c5' },
  { id: 'ultron', label: 'Ultron', hint: 'Âmbar quente', color: '#ff9c3f' },
]

export function AppearancePage() {
  const settings = useSettings((s) => s.settings)
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-[20px] font-semibold">Aparência</h1>
        <p className="text-[13px] text-muted">
          Como o {settings.assistantName} aparece na sua tela.
        </p>
      </header>

      <Field title="Modo de exibição" hint="Dá para trocar a qualquer momento, sem reiniciar.">
        <DisplayModePicker />
      </Field>

      {settings.displayMode === 'notch' && <NotchSettingsPanel />}

      <Field title="Tema / persona" hint="Troca as cores (e, depois, voz e tom) juntos.">
        <div className="grid grid-cols-3 gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void backend.setPersona(p.id)}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                settings.persona === p.id
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border-soft hover:border-accent/30',
              )}
            >
              <span
                className="size-6 rounded-full"
                style={{ background: p.color, boxShadow: `0 0 14px ${p.color}66` }}
              />
              <span>
                <span className="block text-[13px] font-medium">{p.label}</span>
                <span className="block text-[11px] text-muted">{p.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </Field>

      <Field title="Lado do dock" hint="Usado no modo Dock lateral.">
        <Segmented
          value={settings.dockSide}
          options={[
            { value: 'left', label: 'Esquerda' },
            { value: 'right', label: 'Direita' },
          ]}
          onChange={(side) => void backend.setDockSide(side)}
        />
      </Field>

      <Field title="Nomes" hint="Como ele te chama e como você chama ele.">
        <div className="grid grid-cols-2 gap-3">
          <NameInput
            label="Seu nome"
            value={settings.userName}
            onCommit={(v) => void backend.setNames(v, settings.assistantName)}
          />
          <NameInput
            label="Nome do assistente"
            value={settings.assistantName}
            onCommit={(v) => void backend.setNames(settings.userName, v)}
          />
        </div>
      </Field>
    </div>
  )
}

function NameInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label-hud">{label}</span>
      <input
        key={value}
        defaultValue={value}
        onBlur={(e) =>
          e.target.value.trim() && e.target.value !== value && onCommit(e.target.value)
        }
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="rounded-lg border border-border-soft bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent/50"
      />
    </label>
  )
}
