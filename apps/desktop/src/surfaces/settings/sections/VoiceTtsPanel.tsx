import { Play, Square } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { IconButton, Slider } from '@/ui/primitives'
import { Waveform } from '@/ui/Waveform'
import { usePrefs } from './prefsAssistant'
import { TTS_ENGINES } from './voiceCatalog'

const SAMPLE_MS = 2200

/** TTS engine + voice cards with a mocked "Ouvir" preview, plus speaking speed. */
export function VoiceTtsPanel() {
  const voice = usePrefs((s) => s.voice)
  const patch = usePrefs((s) => s.patch)
  const [playing, setPlaying] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const listen = (id: string) => {
    window.clearTimeout(timer.current)
    if (playing === id) return setPlaying(null)
    setPlaying(id)
    timer.current = window.setTimeout(() => setPlaying(null), SAMPLE_MS / voice.speed)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {TTS_ENGINES.map((engine) => (
          <div
            key={engine.id}
            className={cn(
              'flex flex-col gap-2 rounded-xl border bg-surface p-3',
              voice.tts === engine.id ? 'border-accent/60' : 'border-border-soft',
            )}
          >
            <div>
              <div className="text-[13px] font-medium">{engine.title}</div>
              <div className="text-[11px] text-muted">{engine.hint}</div>
            </div>
            <ul className="flex flex-col gap-1">
              {engine.voices.map((v) => {
                const active = voice.tts === engine.id && voice.ttsVoice === v.id
                return (
                  <li
                    key={v.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2 py-1',
                      active ? 'border-accent/40 bg-accent/10' : 'border-transparent',
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => patch('voice', { tts: engine.id, ttsVoice: v.id })}
                      className="min-w-0 flex-1 rounded text-left focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                    >
                      <span className={cn('block text-[12px]', active && 'text-accent')}>
                        {v.name}
                      </span>
                      <span className="block text-[11px] text-muted">{v.hint}</span>
                    </button>
                    {playing === v.id && <Waveform bars={4} />}
                    <IconButton
                      label={playing === v.id ? `Parar ${v.name}` : `Ouvir ${v.name}`}
                      active={playing === v.id}
                      onClick={() => listen(v.id)}
                    >
                      {playing === v.id ? (
                        <Square className="size-3.5" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <label className="flex max-w-md items-center gap-3 text-[12px] text-muted">
        <span className="w-28 shrink-0">Velocidade da fala</span>
        <Slider
          label="Velocidade da fala"
          value={voice.speed}
          min={0.7}
          max={1.5}
          step={0.05}
          onChange={(speed) => patch('voice', { speed })}
        />
        <span className="w-12 shrink-0 text-right font-mono">{voice.speed.toFixed(2)}×</span>
      </label>
    </div>
  )
}
