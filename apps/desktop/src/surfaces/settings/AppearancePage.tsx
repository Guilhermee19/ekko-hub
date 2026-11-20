import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { DEFAULT_APPEARANCE } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Button } from '@/ui/primitives'
import { setAppearance } from './appearance/controls'
import { PanelGroup } from './appearance/PanelGroup'
import { ThemeGroup } from './appearance/ThemeGroup'

/** Colors and the big windows' look. Every control applies live; there is no save. */
export function AppearancePage() {
  const name = useSettings((s) => s.settings.assistantName)
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8 pb-10">
      <header className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[20px] font-semibold">Aparência</h1>
          <p className="text-[13px] text-muted">
            As cores do {name} e o visual das janelas. Notch, pílula e menu têm páginas próprias.
          </p>
        </div>
        <ResetButton />
      </header>

      <ThemeGroup />
      <PanelGroup />
    </div>
  )
}

/** Two-step reset of every look setting: colors, notch, pill, menu and Início
 * (avatar eyes/color belong to the Avatar page). */
function ResetButton() {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return (
      <Button variant="ghost" onClick={() => setArmed(true)}>
        <RotateCcw className="size-3.5" aria-hidden /> Restaurar visual padrão
      </Button>
    )
  }
  const { avatarStyle, avatarColor } = useSettings.getState().settings.appearance
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Confirmar restauração">
      <span className="text-[12px] text-muted">Cores, notch, pílula, menu e Início?</span>
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
