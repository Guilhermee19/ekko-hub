import { useSettings } from '@/stores/settings'
import { Toggle } from '@/ui/forms'
import { Card, Slider } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip, PageFrame, Row } from './GeneralControls'
import { usePrefs } from './prefsAssistant'
import { ComboCapture } from './ShortcutsCapture'
import { useShortcuts } from './shortcutsStore'
import { STT_MODELS } from './voiceCatalog'
import { VoiceMicMeter } from './VoiceMicMeter'
import { VoiceModels } from './VoiceModels'
import { VoiceTtsPanel } from './VoiceTtsPanel'
import { VoiceWakeTraining } from './VoiceWakeTraining'

const sensitivityLabel = (v: number) => (v < 0.35 ? 'Baixa' : v > 0.65 ? 'Alta' : 'Média')

export function VoicePage() {
  const name = useSettings((s) => s.settings.assistantName)
  const voice = usePrefs((s) => s.voice)
  const ptt = useSettings((s) => s.settings.shortcuts.ptt)
  const patch = usePrefs((s) => s.patch)
  const setShortcut = useShortcuts((s) => s.setShortcut)
  const set = (v: Partial<typeof voice>) => patch('voice', v)

  return (
    <PageFrame title="Voz" subtitle={`Como você fala com o ${name} e como ele te responde.`}>
      <Field title="Microfone" hint="Tudo é processado no seu PC; o áudio não sai daqui.">
        <VoiceMicMeter />
      </Field>

      <Field title="Como falar" hint="Segure a tecla para falar, ou deixe o microfone aberto.">
        <Card className="divide-y divide-border-soft py-0.5">
          <Row title="Apertar para falar" hint="Segure enquanto fala; um toque rápido cancela.">
            <ComboCapture
              label="apertar para falar"
              combo={ptt}
              onChange={(c) => void setShortcut('ptt', c)}
            />
          </Row>
          <Row
            title="Modo conversa"
            hint="Microfone aberto: ele percebe quando você termina a frase."
          >
            <Toggle
              label="Modo conversa"
              checked={voice.conversation}
              onChange={(conversation) => set({ conversation })}
            />
          </Row>
        </Card>
      </Field>

      <Field title="Palavra de ativação" hint={`Chame sem tocar no teclado: “Ei, ${name}”.`}>
        <div className="flex flex-col gap-3">
          <Card className="divide-y divide-border-soft py-0.5">
            <Row title={`Ouvir “Ei, ${name}”`} hint="Fica escutando só essa frase, offline.">
              <Toggle
                label="Palavra de ativação"
                checked={voice.wakeWord}
                onChange={(wakeWord) => set({ wakeWord })}
              />
            </Row>
            <label className="flex items-center gap-3 py-2.5 text-[12px] text-muted">
              <span className="w-24 shrink-0">Sensibilidade</span>
              <Slider
                label="Sensibilidade da palavra de ativação"
                value={voice.sensitivity}
                min={0}
                max={1}
                step={0.05}
                disabled={!voice.wakeWord}
                onChange={(sensitivity) => set({ sensitivity })}
              />
              <span className="w-12 shrink-0 text-right">
                {sensitivityLabel(voice.sensitivity)}
              </span>
            </label>
          </Card>
          <VoiceWakeTraining disabled={!voice.wakeWord} />
        </div>
      </Field>

      <Field title="Reconhecimento de fala" hint="Whisper, rodando offline no seu PC.">
        <div className="flex flex-wrap gap-2">
          {STT_MODELS.map((m) => (
            <Chip key={m.id} active={voice.stt === m.id} onClick={() => set({ stt: m.id })}>
              <span className="flex flex-col items-start">
                <span>{m.label}</span>
                <span className="text-[11px] text-muted">{m.hint}</span>
              </span>
            </Chip>
          ))}
        </div>
      </Field>

      <Field title="Voz do assistente" hint="Piper é instantâneo; Kokoro soa mais humano.">
        <VoiceTtsPanel />
      </Field>

      <Field title="Baixar modelos" hint="O Ekko baixa tudo sozinho. Nada para instalar à mão.">
        <VoiceModels />
      </Field>
    </PageFrame>
  )
}
