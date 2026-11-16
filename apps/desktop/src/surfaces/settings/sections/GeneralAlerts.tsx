import { Volume2 } from 'lucide-react'
import { backend, type GeneralSettings, type NotifySound } from '@/lib/ipc'
import { playTone } from '@/lib/notifySound'
import { dndActive, parseHhmm } from '@/lib/quietHours'
import { useSettings } from '@/stores/settings'
import { Input, Toggle } from '@/ui/forms'
import { Button, Card, Slider } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip } from './GeneralControls'

// "Não perturbe" + notification sound, saved in `Settings.general`.

const SOUNDS: { id: NotifySound; label: string }[] = [
  { id: 'chime', label: 'Sininho' },
  { id: 'ping', label: 'Ping HUD' },
  { id: 'soft', label: 'Suave' },
  { id: 'none', label: 'Sem som' },
]

function useGeneral() {
  const general = useSettings((s) => s.settings.general)
  const set = (v: Partial<GeneralSettings>) => void backend.setGeneral({ ...general, ...v })
  return { general, set }
}

export function DndField() {
  const { general, set } = useGeneral()
  const { dnd } = general
  const setDnd = (v: Partial<typeof dnd>) => set({ dnd: { ...dnd, ...v } })
  // The time input reports "" while half typed; only save complete times.
  const setTime = (key: 'from' | 'to', value: string) => {
    if (parseHhmm(value) !== null) setDnd({ [key]: value })
  }
  const activeNow = dndActive(dnd)

  return (
    <Field
      title="Não perturbe"
      hint="Nesse horário os avisos vão só para a central, sem pop-up nem som. Alarmes de timer ainda aparecem, mas em silêncio."
    >
      <Card className="flex flex-wrap items-center gap-4">
        <Toggle
          label="Ativar horário de não perturbe"
          checked={dnd.enabled}
          onChange={(enabled) => setDnd({ enabled })}
        />
        {(['from', 'to'] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-[12px] text-muted">
            {key === 'from' ? 'Das' : 'até'}
            <span className="w-28">
              <Input
                type="time"
                value={dnd[key]}
                disabled={!dnd.enabled}
                onChange={(e) => setTime(key, e.target.value)}
              />
            </span>
          </label>
        ))}
        {activeNow && (
          <span role="status" className="text-[11px] text-accent">
            Ativo agora
          </span>
        )}
      </Card>
    </Field>
  )
}

export function SoundField() {
  const { general, set } = useGeneral()
  return (
    <Field title="Som de notificação" hint="Toca em lembretes, timers e avisos.">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {SOUNDS.map((s) => (
            <Chip
              key={s.id}
              active={general.sound === s.id}
              onClick={() => {
                set({ sound: s.id })
                playTone(s.id, general.volume)
              }}
            >
              {s.label}
            </Chip>
          ))}
        </div>
        <Card className="flex items-center gap-3">
          <Volume2 className="size-4 shrink-0 text-muted" aria-hidden />
          <Slider
            label="Volume das notificações"
            value={Math.round(general.volume * 100)}
            min={0}
            max={100}
            disabled={general.sound === 'none'}
            onChange={(v) => set({ volume: v / 100 })}
          />
          <span className="w-10 text-right text-[12px] text-muted tabular-nums">
            {Math.round(general.volume * 100)}%
          </span>
          <Button
            size="sm"
            variant="subtle"
            disabled={general.sound === 'none'}
            onClick={() => playTone(general.sound, general.volume)}
          >
            Testar
          </Button>
        </Card>
      </div>
    </Field>
  )
}
