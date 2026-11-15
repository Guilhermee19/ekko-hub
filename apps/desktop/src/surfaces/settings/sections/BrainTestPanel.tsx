import { FlaskConical, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { PERSONALITIES, PROVIDERS } from './brainCatalog'
import { usePrefs } from './prefsAssistant'

type Result =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'ok'; ms: number; reply: string; via: string }
  | { kind: 'error'; message: string }

/** "Testar esta IA": fake round trip with latency and a reply in the chosen personality. */
export function BrainTestPanel() {
  const brain = usePrefs((s) => s.brain)
  const downloads = usePrefs((s) => s.downloads)
  const [result, setResult] = useState<Result>({ kind: 'idle' })

  const target = (): { via: string; error?: string } => {
    if (brain.mode === 'auto') return { via: 'Groq · llama-4-scout (grátis)' }
    if (brain.mode === 'local') {
      if (!brain.ollamaFound) return { via: '', error: 'Instale o Ollama primeiro.' }
      if (!downloads[`ollama:${brain.localModel}`]?.done)
        return { via: '', error: `Baixe o ${brain.localModel} primeiro.` }
      return { via: `Ollama · ${brain.localModel}` }
    }
    const p = PROVIDERS.find((x) => x.id === brain.provider)
    if (!p || !brain.keys[brain.provider])
      return { via: '', error: `Cole a chave do ${p?.name ?? 'provedor'} primeiro.` }
    return { via: `${p.name} · ${brain.models[brain.provider]}` }
  }

  const run = () => {
    const t = target()
    if (t.error) return setResult({ kind: 'error', message: t.error })
    setResult({ kind: 'running' })
    const local = brain.mode === 'local'
    const ms = Math.round((local ? 900 : 300) + Math.random() * (local ? 1600 : 900))
    const reply = PERSONALITIES.find((p) => p.id === brain.personality)?.sample ?? ''
    window.setTimeout(() => setResult({ kind: 'ok', ms, reply, via: t.via }), ms)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={result.kind === 'running'}>
          {result.kind === 'running' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <FlaskConical className="size-4" aria-hidden />
          )}
          Testar esta IA
        </Button>
        <span className="text-[12px] text-muted">Pergunta: “Coloca um timer de 10 minutos”</span>
      </div>
      <div aria-live="polite">
        {result.kind === 'ok' && (
          <div className="animate-rise-in rounded-xl border border-border-soft bg-surface p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge tone="accent">{result.ms} ms</Badge>
              <span className="text-[11px] text-muted">{result.via}</span>
            </div>
            <p className="text-[13px]">{result.reply}</p>
          </div>
        )}
        {result.kind === 'error' && (
          <p className="text-[12px] text-danger" role="alert">
            {result.message}
          </p>
        )}
      </div>
    </div>
  )
}
