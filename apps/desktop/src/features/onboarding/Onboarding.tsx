import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { backend } from '@/lib/ipc'
import { sectionShown } from '@/lib/availability'
import { cn } from '@/lib/cn'
import type { SectionId } from '@/surfaces/settings/sections'
import { useLatest } from '@/surfaces/shared/useOverlay'
import { HudFrame, Button, Kbd } from '@/ui/primitives'
import { advance, isBlocked } from './flow'
import { useOnboarding } from './store'
import { BrainStep, NamesStep, WelcomeStep, useNames } from './StepsIntro'
import { AppearanceStep, DoneStep, VoiceStep } from './StepsSetup'

interface Step {
  id: string
  label: string
  view: ComponentType
  /** Settings section the step configures; hidden while that section is "Em breve". */
  section?: SectionId
}

const ALL_STEPS: Step[] = [
  { id: 'welcome', label: 'Boas-vindas', view: WelcomeStep },
  { id: 'names', label: 'Nome', view: NamesStep },
  { id: 'brain', label: 'Cérebro', view: BrainStep, section: 'brain' },
  { id: 'voice', label: 'Voz', view: VoiceStep, section: 'voice' },
  { id: 'look', label: 'Aparência', view: AppearanceStep },
  { id: 'done', label: 'Pronto', view: DoneStep },
]

const STEPS = ALL_STEPS.filter((s) => !s.section || sectionShown(s.section))

/** First-run flow. Fills its container (~720×520 opaque window). */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const names = useNames()
  const mic = useOnboarding((s) => s.mic)
  const blocked = isBlocked(step.id, names.userName)

  const back = () => setIndex((i) => Math.max(0, i - 1))
  const next = () => {
    const a = advance(index, STEPS.length, blocked)
    if (a.kind === 'stay') return
    if (step.id === 'names')
      void backend.setNames(names.userName.trim(), names.assistantName.trim() || 'Ekko')
    if (a.kind === 'finish') return onDone()
    setIndex(a.index)
  }
  const skipVoice = () => {
    if (mic !== 'ok') useOnboarding.getState().skipMic()
    setIndex(index + 1)
  }

  // Enter continues, Esc goes back. Buttons/switches keep their own Enter.
  const onKey = useLatest((e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (e.key === 'Escape') {
      e.preventDefault()
      back()
    } else if (e.key === 'Enter' && !t?.closest('button,[role="switch"],a')) {
      e.preventDefault()
      next()
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey.current(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey])

  const View = step.view
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="relative flex h-full flex-col overflow-hidden bg-base"
    >
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="hud-vignette pointer-events-none absolute inset-0" />
      <HudFrame />

      <Progress index={index} />

      <main
        key={step.id}
        className="animate-rise-in relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-10 py-4"
      >
        <View />
      </main>

      <footer className="relative z-10 flex items-center gap-2 border-t border-border-soft bg-surface/60 px-6 py-3">
        {index > 0 && (
          <Button variant="ghost" onClick={back}>
            <ArrowLeft className="size-4" /> Voltar
          </Button>
        )}
        <span className="flex-1 text-[11px] text-muted">
          <Kbd>Enter</Kbd> continua · <Kbd>Esc</Kbd> volta
        </span>
        {step.id === 'voice' && mic !== 'ok' && (
          <Button variant="ghost" onClick={skipVoice}>
            Pular
          </Button>
        )}
        <Button
          variant="primary"
          onClick={next}
          disabled={blocked}
          autoFocus={step.id !== 'names'}
          key={step.id}
        >
          {last ? (
            <>
              Começar <Rocket className="size-4" />
            </>
          ) : (
            <>
              {index === 0 ? 'Vamos lá' : 'Continuar'} <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </footer>
    </div>
  )
}

function Progress({ index }: { index: number }) {
  return (
    <nav aria-label="Etapas" className="relative z-10 px-8 pt-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 flex-col gap-1.5">
            <span
              className={cn(
                'h-1 rounded-full transition-colors duration-300',
                i < index && 'bg-accent/60',
                i === index && 'hud-glow bg-accent text-accent',
                i > index && 'bg-border-soft',
              )}
            />
            <span
              aria-current={i === index ? 'step' : undefined}
              className={cn(
                'text-[10px] tracking-[0.14em] uppercase',
                i === index ? 'text-accent' : 'text-muted',
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
