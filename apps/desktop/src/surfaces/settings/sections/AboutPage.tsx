import { Check, Globe } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { Field } from '../Field'
import { UpdateBox } from './UpdateBox'

type PhaseStatus = 'done' | 'doing' | 'planned'

// Mirrors docs/ROADMAP.md; update by hand when a phase closes.
const ROADMAP: { id: string; name: string; status: PhaseStatus }[] = [
  { id: 'F0', name: 'Fundação', status: 'done' },
  { id: 'F1', name: 'Interface completa', status: 'done' },
  { id: 'F1.5', name: 'Aparência, timers, música e agenda', status: 'doing' },
  { id: 'F2', name: 'Conversa + IA', status: 'planned' },
  { id: 'F3', name: 'Voz', status: 'planned' },
  { id: 'F4', name: 'Funções fáceis', status: 'planned' },
  { id: 'F5', name: 'Produtividade', status: 'planned' },
  { id: 'F6', name: 'Controle do PC', status: 'planned' },
  { id: 'F7', name: 'Integrações', status: 'doing' },
  { id: 'F8', name: 'Avatar', status: 'planned' },
  { id: 'F9', name: 'Polimento v1', status: 'doing' },
  { id: 'V2', name: 'Servidor + celular', status: 'planned' },
]

const STATUS_LABEL: Record<PhaseStatus, string> = {
  done: 'Pronto',
  doing: 'Em andamento',
  planned: 'Planejado',
}

const AUTHOR = {
  name: 'Guilherme',
  github: 'https://github.com/Guilhermee19',
  portfolio: 'https://iamgui.dev',
}

export function AboutPage() {
  const [version, setVersion] = useState<string | null>(null)
  useEffect(() => {
    void backend.appVersion().then(setVersion)
  }, [])

  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-5">
        <span className="ekko-glow grid size-20 shrink-0 place-items-center rounded-2xl">
          <EkkoEyes phase="idle" className="h-5 w-11" />
        </span>
        <div className="flex-1">
          <h1 className="text-[20px] font-semibold">Ekko Hub</h1>
          <p className="text-[13px] text-muted">
            Seu assistente de desktop, local e morando no topo da tela.
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[12px]">{version ? `v${version}` : '…'}</span>
            <Badge tone="accent">Prévia</Badge>
          </div>
        </div>
      </header>

      <UpdateBox />

      <Field title="Roadmap" hint="Onde o Ekko está e o que vem por aí.">
        <ol className="grid grid-cols-2 gap-x-6 gap-y-1">
          {ROADMAP.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-b border-border-soft py-1.5">
              <span
                className={cn(
                  'grid h-6 min-w-6 shrink-0 place-items-center rounded-full border px-1 font-mono text-[10px]',
                  p.status === 'done' && 'border-accent bg-accent/15 text-accent',
                  p.status === 'doing' && 'hud-glow border-accent text-accent',
                  p.status === 'planned' && 'border-border-soft text-muted',
                )}
              >
                {p.status === 'done' ? <Check className="size-3" aria-hidden /> : p.id}
              </span>
              <span className={cn('flex-1 text-[13px]', p.status === 'planned' && 'text-muted')}>
                <span className="sr-only">{p.id}: </span>
                {p.name}
              </span>
              <Badge tone={p.status === 'planned' ? 'muted' : 'accent'}>
                {STATUS_LABEL[p.status]}
              </Badge>
            </li>
          ))}
        </ol>
      </Field>

      <Field title="Quem fez" hint="O Ekko é um projeto pessoal, feito com Tauri, React e Rust.">
        <p className="text-[13px] text-muted">
          Criado e desenvolvido por <span className="text-content">{AUTHOR.name}</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <LinkButton label="GitHub" url={AUTHOR.github} icon={<GithubMark />} />
          <LinkButton
            label="iamgui.dev"
            url={AUTHOR.portfolio}
            icon={<Globe className="size-4" aria-hidden />}
          />
        </div>
      </Field>
    </div>
  )
}

function LinkButton({ label, url, icon }: { label: string; url: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => void backend.openExternal(url)}
      title={url}
      className="inline-flex items-center gap-2 rounded-lg border border-border-soft px-3 py-1.5 text-[13px] transition-colors hover:border-accent/40 hover:text-accent"
    >
      {icon}
      {label}
    </button>
  )
}

/** GitHub's mark (lucide no longer ships brand icons). */
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}
