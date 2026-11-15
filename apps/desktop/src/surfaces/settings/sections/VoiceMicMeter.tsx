import { cn } from '@/lib/cn'
import { useNow } from '../../shared/useNow'
import { Select } from './GeneralControls'
import { usePrefs } from './prefsAssistant'
import { litBars, MICS, mockMicLevel } from './voiceCatalog'

const BARS = 24

/** Microphone picker with a live (mocked) input level meter. */
export function VoiceMicMeter() {
  const mic = usePrefs((s) => s.voice.mic)
  const patch = usePrefs((s) => s.patch)
  const now = useNow(true, 80)
  // Each device gets its own phase so switching visibly changes the meter.
  const offset = MICS.findIndex((m) => m.id === mic) * 2900
  const lit = litBars(mockMicLevel(now + offset), BARS)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-3">
      <Select
        aria-label="Microfone"
        value={mic}
        onChange={(e) => patch('voice', { mic: e.target.value })}
      >
        {MICS.map((m) => (
          <option key={m.id} value={m.id} className="bg-surface">
            {m.label}
          </option>
        ))}
      </Select>
      <div className="flex items-center gap-3">
        <span className="label-hud w-12 shrink-0">Nível</span>
        <div
          role="meter"
          aria-label="Nível de entrada do microfone"
          aria-valuemin={0}
          aria-valuemax={BARS}
          aria-valuenow={lit}
          className="flex h-3 flex-1 items-stretch gap-[3px]"
        >
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex-1 rounded-sm transition-colors duration-75',
                i < lit ? (i >= BARS - 3 ? 'bg-danger' : 'bg-accent') : 'bg-border-soft',
              )}
            />
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted">Fale algo: as barras devem acender até o meio.</p>
    </div>
  )
}
