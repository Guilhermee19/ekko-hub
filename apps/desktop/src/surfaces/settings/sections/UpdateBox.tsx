import { CircleCheck, Download, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backend, type UpdateInfo } from '@/lib/ipc'
import { Button } from '@/ui/primitives'

type Step =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest'; info: UpdateInfo }
  | { kind: 'available'; info: UpdateInfo }
  | { kind: 'downloading'; info: UpdateInfo; pct: number }
  | { kind: 'error'; message: string }

const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`

/** Checks GitHub for a newer release and installs it with one click. */
export function UpdateBox() {
  const [step, setStep] = useState<Step>({ kind: 'idle' })

  useEffect(() => {
    const off = backend.onUpdateProgress(({ done, total }) =>
      setStep((s) =>
        s.kind === 'downloading' ? { ...s, pct: Math.round((done / total) * 100) } : s,
      ),
    )
    return () => void off.then((f) => f())
  }, [])

  const check = async () => {
    setStep({ kind: 'checking' })
    try {
      const info = await backend.updateCheck()
      setStep({ kind: info.available ? 'available' : 'latest', info })
    } catch (e) {
      setStep({ kind: 'error', message: String(e) })
    }
  }

  const install = async (info: UpdateInfo) => {
    setStep({ kind: 'downloading', info, pct: 0 })
    try {
      // On success Ekko closes itself and the installer reopens it updated.
      await backend.updateInstall()
    } catch (e) {
      setStep({ kind: 'error', message: String(e) })
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold">Atualizações</div>
          <Status step={step} />
        </div>
        {(step.kind === 'idle' || step.kind === 'latest' || step.kind === 'error') && (
          <Button variant="subtle" onClick={() => void check()}>
            <RefreshCw className="size-4" aria-hidden /> Verificar atualizações
          </Button>
        )}
        {step.kind === 'checking' && (
          <Button variant="subtle" disabled>
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Verificando…
          </Button>
        )}
        {step.kind === 'available' && (
          <Button onClick={() => void install(step.info)}>
            <Download className="size-4" aria-hidden /> Baixar e instalar
          </Button>
        )}
      </div>

      {step.kind === 'downloading' && (
        <div
          role="progressbar"
          aria-label="Baixando a atualização"
          aria-valuenow={step.pct}
          className="h-1.5 overflow-hidden rounded-full bg-border-soft"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-200"
            style={{ width: `${step.pct}%` }}
          />
        </div>
      )}

      {(step.kind === 'available' || step.kind === 'downloading') && step.info.notes && (
        <div className="rounded-lg bg-base/60 p-3">
          <div className="label-hud mb-1">O que há de novo na v{step.info.latest}</div>
          <p className="max-h-40 overflow-y-auto text-[12px] whitespace-pre-line text-muted">
            {step.info.notes}
          </p>
          <button
            type="button"
            onClick={() => void backend.openExternal(step.info.pageUrl)}
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-accent hover:underline"
          >
            Ver no GitHub <ExternalLink className="size-3" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

function Status({ step }: { step: Step }) {
  const line = 'text-[12px] text-muted'
  switch (step.kind) {
    case 'idle':
      return <p className={line}>Confere no GitHub se saiu uma versão nova.</p>
    case 'checking':
      return <p className={line}>Procurando a versão mais recente…</p>
    case 'latest':
      return (
        <p className={`${line} flex items-center gap-1.5`}>
          <CircleCheck className="size-3.5 text-accent" aria-hidden />
          Você está na versão mais recente (v{step.info.current}).
        </p>
      )
    case 'available':
      return (
        <p className={line}>
          A <span className="text-content">v{step.info.latest}</span> está disponível (você tem a v
          {step.info.current}
          {step.info.size ? `, ${mb(step.info.size)}` : ''}).
        </p>
      )
    case 'downloading':
      return (
        <p className={line}>
          {step.pct < 100
            ? `Baixando a v${step.info.latest}… ${step.pct}%`
            : 'Instalando: o Ekko fecha e volta sozinho já atualizado.'}
        </p>
      )
    case 'error':
      return <p className="text-[12px] text-danger">Não deu para atualizar: {step.message}</p>
  }
}
