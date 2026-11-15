import { Cloud, HardDrive, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { EkkoCore } from '@/ui/EkkoCore'
import { Badge } from '@/ui/data'
import { Input } from '@/ui/forms'
import { BRAINS, useOnboarding, type BrainMode } from './store'

/** Draft names, falling back to what is saved. */
export function useNames() {
  const saved = useSettings((s) => s.settings)
  const userName = useOnboarding((s) => s.userName) ?? saved.userName
  const assistantName = useOnboarding((s) => s.assistantName) ?? saved.assistantName
  return { userName, assistantName }
}

export function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="mb-5 text-center">
      <h1 id="onboarding-step-title" className="text-[20px] font-semibold">
        {title}
      </h1>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </header>
  )
}

export function WelcomeStep() {
  const { assistantName } = useNames()
  return (
    <div className="flex flex-col items-center text-center">
      <EkkoCore label={assistantName} active level={0.35} className="mb-6 size-44" />
      <h1 id="onboarding-step-title" className="text-[24px] font-semibold">
        Oi! Eu sou o <span className="hud-glow text-accent">{assistantName}</span>
      </h1>
      <p className="mt-2 max-w-sm text-[13px] text-muted">
        Seu assistente aqui no PC. Em um minuto a gente deixa tudo do seu jeito: nome, cérebro, voz
        e visual.
      </p>
    </div>
  )
}

export function NamesStep() {
  const { userName, assistantName } = useNames()
  const setNames = useOnboarding((s) => s.setNames)
  return (
    <div className="mx-auto w-full max-w-sm">
      <StepTitle title="Como a gente se chama?" hint="Dá para mudar depois nas configurações." />
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label-hud">Seu nome</span>
          <Input
            autoFocus
            value={userName}
            maxLength={40}
            placeholder="Como devo te chamar?"
            onChange={(e) => setNames({ userName: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-hud">Nome do assistente</span>
          <Input
            value={assistantName}
            maxLength={24}
            placeholder="Ekko"
            onChange={(e) => setNames({ assistantName: e.target.value })}
          />
          <span className="text-[11px] text-muted">
            A palavra de ativação continua “Ei, Ekko” por enquanto.
          </span>
        </label>
      </div>
    </div>
  )
}

const BRAIN_ICON: Record<BrainMode, LucideIcon> = {
  auto: Cloud,
  choose: SlidersHorizontal,
  local: HardDrive,
}

export function BrainStep() {
  const brain = useOnboarding((s) => s.brain)
  const setBrain = useOnboarding((s) => s.setBrain)
  return (
    <div className="w-full">
      <StepTitle title="Qual cérebro eu uso?" hint="É a IA que pensa e responde por mim." />
      <div role="radiogroup" aria-label="Cérebro" className="grid grid-cols-3 gap-3">
        {BRAINS.map((b) => {
          const Icon = BRAIN_ICON[b.id]
          const on = b.id === brain
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setBrain(b.id)}
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors',
                'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
                on
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border-soft bg-surface hover:border-accent/30',
              )}
            >
              <span className="flex w-full items-center justify-between">
                <Icon className={cn('size-5', on ? 'text-accent' : 'text-muted')} />
                <Badge tone={on ? 'accent' : 'muted'}>{b.tag}</Badge>
              </span>
              <span className="text-[14px] font-medium">{b.title}</span>
              <span className="text-[12px] leading-snug text-muted">{b.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
