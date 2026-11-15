import { Check, Download } from 'lucide-react'
import { Badge } from '@/ui/data'
import { Button, ProgressBar } from '@/ui/primitives'
import { useNow } from '../../shared/useNow'
import { mockDownloadMs } from './brainCatalog'
import { anyDownloading, downloadProgress, usePrefs } from './prefsAssistant'
import { VOICE_MODELS } from './voiceCatalog'

/** "Baixar modelos": voice models the app downloads itself (mocked progress). */
export function VoiceModels() {
  const downloads = usePrefs((s) => s.downloads)
  const startDownload = usePrefs((s) => s.startDownload)
  const now = useNow(anyDownloading(downloads), 200)
  const pending = VOICE_MODELS.filter((m) => !downloads[m.id])
  const totalMb = pending.reduce((sum, m) => sum + m.sizeMb, 0)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-muted">
          {pending.length ? `${pending.length} para baixar · ${totalMb} MB` : 'Tudo baixado'}
        </span>
        <Button
          size="sm"
          variant="primary"
          disabled={!pending.length}
          onClick={() => pending.forEach((m) => startDownload(m.id, mockDownloadMs(m.sizeMb)))}
        >
          <Download className="size-3.5" aria-hidden /> Baixar todos
        </Button>
      </div>
      <ul className="divide-y divide-border-soft">
        {VOICE_MODELS.map((m) => {
          const progress = downloadProgress(downloads[m.id], now)
          return (
            <li key={m.id} className="flex flex-col gap-1.5 py-2">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 text-[12px]">{m.label}</span>
                <span className="font-mono text-[11px] text-muted tabular-nums">{m.sizeMb} MB</span>
                {progress === null ? (
                  <Button
                    size="sm"
                    onClick={() => startDownload(m.id, mockDownloadMs(m.sizeMb))}
                    aria-label={`Baixar ${m.label}`}
                  >
                    Baixar
                  </Button>
                ) : progress < 1 ? (
                  <span className="w-10 text-right font-mono text-[11px] text-muted tabular-nums">
                    {Math.round(progress * 100)}%
                  </span>
                ) : (
                  <Badge tone="accent">
                    <Check className="size-3" aria-hidden /> pronto
                  </Badge>
                )}
              </div>
              {progress !== null && progress < 1 && <ProgressBar value={progress} />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
