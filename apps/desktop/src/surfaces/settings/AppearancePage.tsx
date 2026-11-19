import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { backend, DEFAULT_APPEARANCE } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Button, Segmented } from '@/ui/primitives'
import { setAppearance } from './appearance/controls'
import { MenuGroup } from './appearance/MenuGroup'
import { NotchLookGroup } from './appearance/NotchLookGroup'
import { PanelGroup } from './appearance/PanelGroup'
import { PillGroup } from './appearance/PillGroup'
import { ThemeGroup } from './appearance/ThemeGroup'
import { DisplayModePicker } from './DisplayModePicker'
import { Field } from './Field'

/** Everything about how Ekko looks. Every control applies live; there is no save. */
export function AppearancePage() {
  const settings = useSettings((s) => s.settings)
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8 pb-10">
      <header className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[20px] font-semibold">Aparência</h1>
          <p className="text-[13px] text-muted">
            Como o {settings.assistantName} aparece na sua tela. Tudo muda na hora.
          </p>
        </div>
        <ResetButton />
      </header>

      <Field title="Modo de exibição" hint="Dá para trocar a qualquer momento, sem reiniciar.">
        <DisplayModePicker />
      </Field>

      <ThemeGroup />
      <NotchLookGroup />
      <PillGroup />
      <PanelGroup />
      <MenuGroup />

      <section className="flex flex-col gap-6 border-t border-border-soft pt-6">
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
      </section>
    </div>
  )
}

/** Two-step reset (look only; avatar eyes/color belong to the Avatar page). */
function ResetButton() {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <Button variant="ghost" onClick={() => setArmed(true)}>
        <RotateCcw className="size-3.5" aria-hidden /> Restaurar aparência padrão
      </Button>
    )
  }
  const { avatarStyle, avatarColor } = useSettings.getState().settings.appearance
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Confirmar restauração">
      <Button variant="ghost" onClick={() => setArmed(false)}>
        Cancelar
      </Button>
      <Button
        variant="danger"
        onClick={() => {
          setAppearance({ ...DEFAULT_APPEARANCE, avatarStyle, avatarColor })
          setArmed(false)
        }}
      >
        Restaurar tudo
      </Button>
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
