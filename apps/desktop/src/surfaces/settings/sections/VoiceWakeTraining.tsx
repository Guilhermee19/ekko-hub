import { Check, Mic, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/ui/data'
import { Button, ProgressBar } from '@/ui/primitives'
import { Waveform } from '@/ui/Waveform'
import { toast, usePrefs } from './prefsAssistant'
import { WAKE_SAMPLES } from './voiceCatalog'

const RECORD_MS = 2000

/** "Treinar com minha voz": record "Ei, Ekko" 4 times (mocked with timeouts). */
export function VoiceWakeTraining({ disabled }: { disabled: boolean }) {
  const samples = usePrefs((s) => s.voice.wakeSamples)
  const patch = usePrefs((s) => s.patch)
  const [recording, setRecording] = useState<number | null>(null)
  const done = samples.filter(Boolean).length

  const record = (i: number) => {
    setRecording(i)
    window.setTimeout(() => {
      setRecording(null)
      const next = usePrefs.getState().voice.wakeSamples.map((v, j) => (j === i ? true : v))
      patch('voice', { wakeSamples: next })
      if (next.every(Boolean)) toast('Pronto! O Ekko aprendeu a sua voz.')
    }, RECORD_MS)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-medium">Treinar com minha voz</div>
          <div className="text-[11px] text-muted">
            Diga “Ei, Ekko” {WAKE_SAMPLES} vezes, em tom normal, para ele te reconhecer melhor.
          </div>
        </div>
        <Badge tone={done === WAKE_SAMPLES ? 'accent' : 'muted'}>
          {done}/{WAKE_SAMPLES}
        </Badge>
      </div>
      <ProgressBar value={done / WAKE_SAMPLES} />
      <ol className="grid grid-cols-4 gap-2">
        {samples.map((ok, i) => (
          <li
            key={i}
            className="flex flex-col items-center gap-2 rounded-lg border border-border-soft bg-base/60 p-2.5"
          >
            <span className="label-hud">Gravação {i + 1}</span>
            <span className="grid h-5 place-items-center" aria-live="polite">
              {recording === i ? (
                <Waveform bars={7} tone="danger" />
              ) : ok ? (
                <Check className="size-4 text-accent" aria-label="Gravada" />
              ) : (
                <span className="text-[11px] text-muted">vazia</span>
              )}
            </span>
            <Button
              size="sm"
              variant={ok ? 'ghost' : 'subtle'}
              disabled={disabled || recording !== null}
              onClick={() => record(i)}
              aria-label={`${ok ? 'Regravar' : 'Gravar'} amostra ${i + 1}`}
            >
              {ok ? (
                <RotateCcw className="size-3" aria-hidden />
              ) : (
                <Mic className="size-3" aria-hidden />
              )}
              {recording === i ? 'Ouvindo…' : ok ? 'Regravar' : 'Gravar'}
            </Button>
          </li>
        ))}
      </ol>
    </div>
  )
}
