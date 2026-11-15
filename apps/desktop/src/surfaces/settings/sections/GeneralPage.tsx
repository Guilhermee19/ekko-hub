import { Moon, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { backend } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Badge } from '@/ui/data'
import { Input, Toggle } from '@/ui/forms'
import { Button, Card } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip, PageFrame, Row } from './GeneralControls'
import { toast, usePrefs, type NotifySound } from './prefsAssistant'

const LANGUAGES = [
  { id: 'pt-BR', label: 'Português (Brasil)', ready: true },
  { id: 'en', label: 'English', ready: false },
  { id: 'es', label: 'Español', ready: false },
]

const SOUNDS: { id: NotifySound; label: string }[] = [
  { id: 'chime', label: 'Sininho' },
  { id: 'ping', label: 'Ping HUD' },
  { id: 'soft', label: 'Suave' },
  { id: 'none', label: 'Sem som' },
]

export function GeneralPage() {
  const name = useSettings((s) => s.settings.assistantName)
  const general = usePrefs((s) => s.general)
  const patch = usePrefs((s) => s.patch)
  const set = (v: Partial<typeof general>) => patch('general', v)
  const setDnd = (v: Partial<typeof general.dnd>) => set({ dnd: { ...general.dnd, ...v } })

  return (
    <PageFrame title="Geral" subtitle={`Como o ${name} se comporta no seu Windows.`}>
      <Field title="Inicialização" hint="Ligar junto com o PC e sair da frente quando você joga.">
        <Card className="divide-y divide-border-soft py-0.5">
          <Row title="Iniciar com o Windows" hint="Abre minimizado, direto no notch.">
            <Toggle
              label="Iniciar com o Windows"
              checked={general.autostart}
              onChange={(autostart) => set({ autostart })}
            />
          </Row>
          <Row
            title="Esconder em tela cheia (jogos e vídeos)"
            hint="Some enquanto um app estiver em tela cheia."
          >
            <Toggle
              label="Esconder em tela cheia"
              checked={general.hideFullscreen}
              onChange={(hideFullscreen) => set({ hideFullscreen })}
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

      <Field title="Tema" hint="Cores por persona ficam em Aparência.">
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

      <Field title="Não perturbe" hint="Nesse horário, só alarmes tocam; o resto fica em silêncio.">
        <Card className="flex flex-wrap items-center gap-4">
          <Toggle
            label="Ativar horário de não perturbe"
            checked={general.dnd.enabled}
            onChange={(enabled) => setDnd({ enabled })}
          />
          <label className="flex items-center gap-2 text-[12px] text-muted">
            Das
            <span className="w-28">
              <Input
                type="time"
                value={general.dnd.from}
                disabled={!general.dnd.enabled}
                onChange={(e) => setDnd({ from: e.target.value })}
              />
            </span>
          </label>
          <label className="flex items-center gap-2 text-[12px] text-muted">
            até
            <span className="w-28">
              <Input
                type="time"
                value={general.dnd.to}
                disabled={!general.dnd.enabled}
                onChange={(e) => setDnd({ to: e.target.value })}
              />
            </span>
          </label>
        </Card>
      </Field>

      <Field title="Som de notificação" hint="Toca em lembretes, timers e avisos.">
        <div className="flex flex-wrap gap-2">
          {SOUNDS.map((s) => (
            <Chip key={s.id} active={general.sound === s.id} onClick={() => set({ sound: s.id })}>
              {s.label}
            </Chip>
          ))}
        </div>
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
  const reset = usePrefs((s) => s.reset)
  return (
    <Field
      title="Restaurar configurações"
      hint="Volta tudo ao padrão. Suas conversas e notas ficam."
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
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                reset()
                setConfirming(false)
                toast('Configurações restauradas')
              }}
            >
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
