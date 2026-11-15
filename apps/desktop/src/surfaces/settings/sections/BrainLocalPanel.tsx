import { Check, Download, HardDrive, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Button, ProgressBar } from '@/ui/primitives'
import { useNow } from '../../shared/useNow'
import { mockDownloadMs, OLLAMA_MODELS } from './brainCatalog'
import { anyDownloading, downloadProgress, toast, usePrefs } from './prefsAssistant'

const formatSize = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`)

/** "No meu PC": Ollama detection, guided install and model downloads (all mocked). */
export function BrainLocalPanel() {
  const brain = usePrefs((s) => s.brain)
  const patch = usePrefs((s) => s.patch)
  const downloads = usePrefs((s) => s.downloads)
  const startDownload = usePrefs((s) => s.startDownload)
  const [installing, setInstalling] = useState(false)
  const now = useNow(anyDownloading(downloads), 200)

  const install = () => {
    setInstalling(true)
    window.setTimeout(() => {
      setInstalling(false)
      patch('brain', { ollamaFound: true })
      toast('Ollama instalado')
    }, 2200)
  }

  if (!brain.ollamaFound)
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border-soft bg-surface p-4">
        <HardDrive className="size-6 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            Ollama <Badge tone="danger">não encontrado</Badge>
          </div>
          <p className="text-[12px] text-muted">
            É o programa que roda a IA no seu PC. O Ekko baixa e instala para você.
          </p>
        </div>
        <Button variant="primary" disabled={installing} onClick={install}>
          {installing ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
          {installing ? 'Instalando…' : 'Instalar Ollama'}
        </Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        <Badge tone="accent">Ollama encontrado</Badge> v0.12 · localhost:11434
      </div>
      <ul className="flex flex-col gap-2">
        {OLLAMA_MODELS.map((m) => {
          const progress = downloadProgress(downloads[`ollama:${m.id}`], now)
          const ready = progress === 1
          const active = brain.localModel === m.id
          return (
            <li
              key={m.id}
              className={cn(
                'flex flex-col gap-2 rounded-xl border bg-surface p-3',
                active && ready ? 'border-accent/60' : 'border-border-soft',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-[13px]">
                    {m.id}
                    {m.recommended && <Badge tone="accent">recomendado</Badge>}
                  </div>
                  <div className="text-[11px] text-muted">
                    {m.hint} · {formatSize(m.sizeMb)} · tool calling
                  </div>
                </div>
                {progress === null && (
                  <Button
                    size="sm"
                    onClick={() => startDownload(`ollama:${m.id}`, mockDownloadMs(m.sizeMb))}
                  >
                    <Download className="size-3.5" aria-hidden /> Baixar
                  </Button>
                )}
                {progress !== null && !ready && (
                  <span className="font-mono text-[11px] text-muted tabular-nums">
                    {Math.round(progress * 100)}%
                  </span>
                )}
                {ready && (
                  <Button
                    size="sm"
                    variant={active ? 'ghost' : 'subtle'}
                    disabled={active}
                    onClick={() => patch('brain', { localModel: m.id })}
                  >
                    {active && <Check className="size-3.5" aria-hidden />}
                    {active ? 'Em uso' : 'Usar este'}
                  </Button>
                )}
              </div>
              {progress !== null && !ready && <ProgressBar value={progress} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
