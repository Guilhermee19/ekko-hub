import { Check, Mic } from 'lucide-react'
import { backend, type Persona } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { MODES, DisplayModePicker } from '@/surfaces/settings/DisplayModePicker'
import { useNow } from '@/surfaces/shared/useNow'
import { Card, Button } from '@/ui/primitives'
import { Toggle } from '@/ui/forms'
import { BRAINS, useOnboarding } from './store'
import { StepTitle, useNames } from './StepsIntro'

const BARS = 24

/** Fake mic level: a few sines, so the meter "talks" without a real microphone. */
function fakeLevel(t: number, bar: number): number {
  const v = 0.45 + 0.3 * Math.sin(t / 170 + bar * 0.7) + 0.2 * Math.sin(t / 61 + bar * 1.9)
  return Math.min(1, Math.max(0.08, v))
}

export function VoiceStep() {
  const mic = useOnboarding((s) => s.mic)
  const wakeWord = useOnboarding((s) => s.wakeWord)
  const { startMicTest, setWakeWord } = useOnboarding.getState()
  const testing = mic === 'testing'
  const now = useNow(testing, 80)

  return (
    <div className="mx-auto w-full max-w-md">
      <StepTitle title="Vamos testar sua voz" hint="Fale qualquer coisa enquanto o teste roda." />
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-full',
              testing ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent',
            )}
          >
            {mic === 'ok' ? <Check className="size-4.5" /> : <Mic className="size-4.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">Microfone padrão do Windows</div>
            <div className="text-[12px] text-muted" aria-live="polite">
              {mic === 'idle' && 'Ainda não testado.'}
              {mic === 'testing' && 'Ouvindo…'}
              {mic === 'ok' && 'Tudo certo, estou te ouvindo bem!'}
              {mic === 'skipped' && 'Teste pulado. Dá para testar depois.'}
            </div>
          </div>
          <Button
            variant={mic === 'ok' ? 'subtle' : 'primary'}
            onClick={startMicTest}
            disabled={testing}
          >
            {mic === 'ok' ? 'Testar de novo' : 'Testar microfone'}
          </Button>
        </div>
        <div className="flex h-10 items-center gap-1" aria-hidden>
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              className={cn(
                'flex-1 rounded-full transition-[height] duration-75',
                testing ? 'bg-accent' : 'bg-border-soft',
              )}
              style={{ height: `${(testing ? fakeLevel(now, i) : 0.12) * 100}%` }}
            />
          ))}
        </div>
      </Card>
      <Card className="mt-3 flex items-center gap-3 p-4">
        <div className="flex-1">
          <div className="text-[13px] font-medium">Palavra de ativação “Ei, Ekko”</div>
          <div className="text-[12px] text-muted">
            Me chame pela voz, sem tocar no teclado. Tudo processado no seu PC.
          </div>
        </div>
        <Toggle checked={wakeWord} label="Ativar “Ei, Ekko”" onChange={setWakeWord} />
      </Card>
    </div>
  )
}

const PERSONAS: { id: Persona; label: string; hint: string }[] = [
  { id: 'ekko', label: 'Ekko', hint: 'Ciano HUD' },
  { id: 'eco', label: 'Eco', hint: 'Verde-água' },
  { id: 'ultron', label: 'Ultron', hint: 'Âmbar' },
]

export function AppearanceStep() {
  const persona = useSettings((s) => s.settings.persona)
  return (
    <div className="w-full">
      <StepTitle title="Onde e como eu apareço?" />
      <DisplayModePicker dense />
      <div className="label-hud mt-5 mb-2">Cores</div>
      <div role="radiogroup" aria-label="Persona" className="grid grid-cols-3 gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={persona === p.id}
            onClick={() => void backend.setPersona(p.id)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
              persona === p.id
                ? 'border-accent/60 bg-accent/10'
                : 'border-border-soft hover:border-accent/30',
            )}
          >
            {/* Picking repaints the whole window, which is the preview. */}
            <span
              className={cn(
                'size-4 rounded-full',
                persona === p.id ? 'hud-glow bg-accent text-accent' : 'bg-border-soft',
              )}
            />
            <span>
              <span className="block text-[12px] font-medium">{p.label}</span>
              <span className="block text-[11px] text-muted">{p.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function DoneStep() {
  const { userName, assistantName } = useNames()
  const { brain, wakeWord, mic } = useOnboarding()
  const settings = useSettings((s) => s.settings)
  const rows: [string, string][] = [
    ['Você', userName || '—'],
    ['Assistente', assistantName],
    ['Cérebro', BRAINS.find((b) => b.id === brain)?.title ?? brain],
    ['Microfone', mic === 'ok' ? 'Testado' : 'Não testado'],
    ['“Ei, Ekko”', wakeWord ? 'Ligado' : 'Desligado'],
    ['Exibição', MODES.find((m) => m.id === settings.displayMode)?.label ?? ''],
    ['Cores', PERSONAS.find((p) => p.id === settings.persona)?.label ?? ''],
  ]
  return (
    <div className="mx-auto w-full max-w-sm">
      <StepTitle
        title={`Tudo pronto, ${userName || 'por aqui'}!`}
        hint={`Me chame com Ctrl+Espaço${wakeWord ? ' ou dizendo “Ei, Ekko”' : ''}.`}
      />
      <dl className="divide-y divide-border-soft rounded-xl border border-border-soft bg-surface">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-3.5 py-2 text-[13px]">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
