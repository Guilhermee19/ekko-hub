import { Moon, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { backend, DEFAULT_GENERAL } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Badge } from '@/ui/data'
import { Toggle } from '@/ui/forms'
import { Button, Card } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip, PageFrame, Row } from './GeneralControls'
import { NamesField } from './NamesField'
import { toast, usePrefs } from './prefsAssistant'
import { DEFAULT_SHORTCUTS } from './shortcutsCombo'
import { useShortcuts } from './shortcutsStore'

const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (Brasil)', ready: true },
  { id: 'en', label: 'English', ready: false },
  { id: 'es', label: 'Español', ready: false },
]

export function GeneralPage() {
  const name = useSettings((s) => s.settings.assistantName)
  const general = useSettings((s) => s.settings.general)

  const setAutostart = (on: boolean) => {
    backend.setAutostart(on).then(
      (real) => {
        if (real !== on) toast('O Windows não aceitou a mudança')
      },
      () => toast('Não deu para mudar a inicialização com o Windows'),
    )
  }

  return (
    <PageFrame title="Geral" subtitle={`Quem é quem e como o ${name} se comporta no seu Windows.`}>
      <NamesField />

      <Field title="Inicialização" hint="Ligar junto com o PC e sair da frente quando você joga.">
        <Card className="divide-y divide-border-soft py-0.5">
          <Row title="Iniciar com o Windows" hint="Abre sozinho ao entrar no Windows.">
            <Toggle
              label="Iniciar com o Windows"
              checked={general.autostart}
              onChange={setAutostart}
            />
          </Row>
          <Row
            title="Esconder em tela cheia (jogos e vídeos)"
            hint="Some enquanto um app estiver em tela cheia no monitor do Ekko."
          >
            <Toggle
              label="Esconder em tela cheia"
              checked={general.hideFullscreen}
              onChange={(hideFullscreen) => void backend.setGeneral({ ...general, hideFullscreen })}
            />
          </Row>
        </Card>
      </Field>

      <Field title="Idioma" hint="Idioma da interface e da conversa.">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <Chip key={l.id} active={l.ready} disabled={!l.ready} onClick={() => {}}>
              {l.label}
              {!l.ready && <Badge>em breve</Badge>}
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Claro ou escuro" hint="As cores (persona e destaque) ficam em Aparência.">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active onClick={() => {}}>
            <Moon className="size-3.5" /> Escuro HUD
          </Chip>
          <Chip active={false} disabled onClick={() => {}}>
            Claro <Badge>em breve</Badge>
          </Chip>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Por enquanto só o escuro: o visual HUD foi pensado para ele.
        </p>
      </Field>

      <Field title="Boas-vindas" hint="Passa de novo pelo tour inicial e pela escolha de modo.">
        <Button onClick={() => void backend.openOnboarding()}>
          <Sparkles className="size-4" /> Refazer boas-vindas
        </Button>
      </Field>

      <ResetField />
    </PageFrame>
  )
}

/** Reset with an inline confirm step instead of a modal. */
function ResetField() {
  const [confirming, setConfirming] = useState(false)
  const general = useSettings((s) => s.settings.general)
  const resetPrefs = usePrefs((s) => s.reset)
  const saveShortcuts = useShortcuts((s) => s.save)

  const reset = async () => {
    resetPrefs()
    // "Iniciar com o Windows" mirrors the OS and stays as the user left it.
    await backend.setGeneral({ ...DEFAULT_GENERAL, autostart: general.autostart })
    await saveShortcuts(DEFAULT_SHORTCUTS)
    setConfirming(false)
    toast('Configurações restauradas')
  }

  return (
    <Field
      title="Restaurar configurações"
      hint="Volta tudo ao padrão, menos a inicialização com o Windows. Suas conversas e notas ficam."
    >
      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <span role="alert" className="text-[13px]">
            Restaurar todas as configurações?
          </span>
          <span className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="danger" onClick={() => void reset()}>
              Sim, restaurar
            </Button>
          </span>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <RotateCcw className="size-4" /> Restaurar padrões
        </Button>
      )}
    </Field>
  )
}
