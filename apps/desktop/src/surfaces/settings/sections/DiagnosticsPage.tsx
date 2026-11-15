import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Copy,
  FolderOpen,
  LoaderCircle,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button, ProgressBar } from '@/ui/primitives'
import { useNow } from '../../shared/useNow'
import { Field } from '../Field'
import { CHECKS, LOG_TICK_MS, logTail, type CheckStatus } from './diagnosticsChecks'
import { toast, usePrefsSystem } from './prefsSystem'
import { PageTitle } from './systemUi'

const STATUS_ICON: Record<CheckStatus, typeof CircleCheck> = {
  pending: CircleDashed,
  running: LoaderCircle,
  ok: CircleCheck,
  warn: CircleAlert,
  error: CircleX,
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  pending: 'Aguardando',
  running: 'Testando',
  ok: 'Ok',
  warn: 'Aviso',
  error: 'Erro',
}

export function DiagnosticsPage() {
  const checks = usePrefsSystem((s) => s.checks)
  const checking = usePrefsSystem((s) => s.checking)
  const runDiagnostics = usePrefsSystem((s) => s.runDiagnostics)
  const now = useNow(true, LOG_TICK_MS)
  const done = CHECKS.filter((c) => !['pending', 'running'].includes(checks[c.id].status)).length
  const memory = 138 + (Math.floor(now / LOG_TICK_MS) % 9)

  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <PageTitle
        title="Diagnóstico"
        subtitle="Confira se microfone, voz, IA e o resto estão funcionando."
      />

      <Field
        title="Verificações"
        hint="Roda um teste rápido em cada parte do Ekko, uma de cada vez."
      >
        <div className="mb-3 flex items-center gap-3">
          <Button variant="primary" onClick={runDiagnostics} disabled={checking}>
            {checking ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {checking ? 'Testando…' : 'Testar tudo'}
          </Button>
          <ProgressBar value={done / CHECKS.length} className="max-w-48 flex-1" />
          <span className="font-mono text-[12px] text-muted tabular-nums">
            {done}/{CHECKS.length}
          </span>
        </div>
        <ul
          className="divide-y divide-border-soft rounded-xl border border-border-soft"
          aria-live="polite"
        >
          {CHECKS.map(({ id, label, icon: Icon }) => {
            const { status, detail } = checks[id]
            const StatusIcon = STATUS_ICON[status]
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2">
                <Icon className="size-4 text-muted" aria-hidden />
                <span className="w-44 shrink-0 text-[13px]">{label}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{detail}</span>
                <StatusIcon
                  aria-label={STATUS_LABEL[status]}
                  className={cn(
                    'size-4 shrink-0',
                    status === 'pending' && 'text-muted/60',
                    status === 'running' && 'animate-spin text-accent',
                    status === 'ok' && 'text-accent',
                    status === 'warn' && 'text-content',
                    status === 'error' && 'text-danger',
                  )}
                />
              </li>
            )
          })}
        </ul>
      </Field>

      <Field title="Sobre este app" hint="Útil para mandar junto quando algo der errado.">
        <dl className="grid grid-cols-4 gap-2">
          {[
            ['Versão', '0.1.0'],
            ['Tauri', '2.x'],
            ['WebView2', '131.0'],
            ['Memória', `${memory} MB`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border-soft bg-surface p-3">
              <dt className="label-hud">{k}</dt>
              <dd className="font-mono text-[13px] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => toast('Abrindo %APPDATA%\\ekko-hub\\logs')}>
            <FolderOpen className="size-4" aria-hidden /> Abrir pasta de logs
          </Button>
          <Button onClick={() => toast('Relatório copiado')}>
            <Copy className="size-4" aria-hidden /> Copiar relatório
          </Button>
        </div>
      </Field>

      <Field title="Log ao vivo" hint="As últimas linhas do log do Ekko.">
        <pre
          aria-label="Últimas linhas do log"
          className="scroll-thin overflow-x-auto rounded-xl border border-border-soft bg-base p-3 font-mono text-[11px] leading-relaxed text-muted"
        >
          {logTail(now).map((l) => (
            <div key={l.key} className={cn(l.text.startsWith('WARN') && 'text-content')}>
              <span className="text-accent/70">{new Date(l.time).toLocaleTimeString('pt-BR')}</span>{' '}
              {l.text}
            </div>
          ))}
        </pre>
      </Field>
    </div>
  )
}
