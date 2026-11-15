import { Cloud, Cpu, KeyRound, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { Badge } from '@/ui/data'
import { Field } from '../Field'
import { MODES, PERSONALITIES, PROVIDERS } from './brainCatalog'
import { BrainLocalPanel } from './BrainLocalPanel'
import { BrainProviderCard } from './BrainProviderCard'
import { BrainTestPanel } from './BrainTestPanel'
import { PageFrame } from './GeneralControls'
import { usePrefs, type BrainMode } from './prefsAssistant'

const MODE_ICONS: Record<BrainMode, LucideIcon> = { auto: Cloud, pick: KeyRound, local: Cpu }

export function BrainPage() {
  const name = useSettings((s) => s.settings.assistantName)
  const brain = usePrefs((s) => s.brain)
  const patch = usePrefs((s) => s.patch)

  return (
    <PageFrame title="Cérebro (IA)" subtitle={`Qual inteligência o ${name} usa para pensar.`}>
      <Field title="Modo" hint="Dá para trocar quando quiser. Seus dados e conversas continuam.">
        <div role="radiogroup" aria-label="Modo do cérebro" className="grid grid-cols-3 gap-2">
          {MODES.map((m) => {
            const Icon = MODE_ICONS[m.id]
            const active = brain.mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch('brain', { mode: m.id })}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
                  active
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-border-soft hover:border-accent/30',
                )}
              >
                <span className="flex items-center justify-between">
                  <Icon className={cn('size-5', active ? 'text-accent' : 'text-muted')} />
                  <Badge tone={active ? 'accent' : 'muted'}>{m.tag}</Badge>
                </span>
                <span className="text-[13px] font-medium">{m.title}</span>
                <span className="text-[11px] text-muted">{m.hint}</span>
              </button>
            )
          })}
        </div>
      </Field>

      {brain.mode === 'auto' && (
        <Field title="Como funciona" hint="Sem cadastro e sem cartão.">
          <div className="rounded-xl border border-border-soft bg-surface p-3 text-[12px] text-muted">
            Usa o <span className="text-content">Groq</span> (mais rápido) e, se o limite grátis
            acabar ou ele cair, troca sozinho para o <span className="text-content">Gemini</span>.
            Você nem percebe.
          </div>
        </Field>
      )}

      {brain.mode === 'pick' && (
        <Field
          title="Provedores"
          hint="Cole a chave do provedor que você assina e escolha o modelo."
        >
          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map((p) => (
              <BrainProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </Field>
      )}

      {brain.mode === 'local' && (
        <Field
          title="Ollama"
          hint="Tudo offline. Os modelos qwen3 entendem ferramentas (timer, tarefas…)."
        >
          <BrainLocalPanel />
        </Field>
      )}

      <Field title="Testar" hint="Manda uma pergunta curta e mede quanto demora a resposta.">
        <BrainTestPanel />
      </Field>

      <Field title="Personalidade" hint="O jeito de falar. Muda o tom, não o que ele sabe fazer.">
        <div role="radiogroup" aria-label="Personalidade" className="grid grid-cols-5 gap-2">
          {PERSONALITIES.map((p) => {
            const active = brain.personality === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch('brain', { personality: p.id })}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-2.5 text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
                  active
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-border-soft hover:border-accent/30',
                )}
              >
                <span className={cn('text-[12px] font-medium', active && 'text-accent')}>
                  {p.label}
                </span>
                <span className="text-[11px] leading-snug text-muted">“{p.sample}”</span>
              </button>
            )
          })}
        </div>
      </Field>
    </PageFrame>
  )
}
