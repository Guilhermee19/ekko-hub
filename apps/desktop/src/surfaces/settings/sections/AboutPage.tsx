import { Check, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { EkkoCore } from '@/ui/EkkoCore'
import { Button } from '@/ui/primitives'
import { Field } from '../Field'
import { toast } from './prefsSystem'

type PhaseStatus = 'done' | 'doing' | 'planned'

// Mirrors docs/ROADMAP.md; update by hand when a phase closes.
const ROADMAP: { id: string; name: string; status: PhaseStatus }[] = [
  { id: 'F0', name: 'Fundação', status: 'done' },
  { id: 'F1', name: 'Interface com dados de exemplo', status: 'doing' },
  { id: 'F2', name: 'Conversa + IA', status: 'planned' },
  { id: 'F3', name: 'Voz', status: 'planned' },
  { id: 'F4', name: 'Funções fáceis', status: 'planned' },
  { id: 'F5', name: 'Produtividade', status: 'planned' },
  { id: 'F6', name: 'Controle do PC', status: 'planned' },
  { id: 'F7', name: 'Integrações', status: 'planned' },
  { id: 'F8', name: 'Avatar', status: 'planned' },
  { id: 'F9', name: 'Polimento v1', status: 'planned' },
  { id: 'V2', name: 'Servidor + celular', status: 'planned' },
]

const STATUS_LABEL: Record<PhaseStatus, string> = {
  done: 'Pronto',
  doing: 'Em andamento',
  planned: 'Planejado',
}

export function AboutPage() {
  const [checking, setChecking] = useState(false)

  const checkUpdates = () => {
    setChecking(true)
    window.setTimeout(() => {
      setChecking(false)
      toast('Você está na versão mais recente')
    }, 1200)
  }

  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex items-center gap-5">
        <EkkoCore label="Ekko" className="size-20 shrink-0" />
        <div className="flex-1">
          <h1 className="text-[20px] font-semibold">Ekko Hub</h1>
          <p className="text-[13px] text-muted">
            Seu assistente de desktop, local e com cara de HUD.
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[12px]">v0.1.0</span>
            <Badge tone="accent">F1 · protótipo</Badge>
          </div>
        </div>
        <Button onClick={checkUpdates} disabled={checking}>
          {checking ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {checking ? 'Verificando…' : 'Verificar atualizações'}
        </Button>
      </header>

      <Field title="Roadmap" hint="Onde o Ekko está e o que vem por aí.">
        <ol className="grid grid-cols-2 gap-x-6 gap-y-1">
          {ROADMAP.map((p) => (
            <li key={p.id} className="flex items-center gap-3 border-b border-border-soft py-1.5">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]',
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

      <Field title="Créditos" hint="De onde vieram as ideias.">
        <p className="text-[13px] text-muted">
          Inspirado no <span className="text-content">Kobi</span> (o notch e o catálogo de funções)
          e no <span className="text-content">Jarvis</span> (o visual HUD, a voz e a segurança das
          ações). Feito com Tauri, React e Rust.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 -ml-2"
          onClick={() => toast('Licenças de terceiros: em breve')}
        >
          <ExternalLink className="size-3.5" aria-hidden /> Licenças de código aberto
        </Button>
      </Field>
    </div>
  )
}
