import { AppWindow, X } from 'lucide-react'
import { EmptyState } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { formatMem, useMyPc } from './store'

/** "Programas pesados agora": closing needs an inline confirm (F6 adds risk levels). */
export function HeavyApps() {
  const apps = useMyPc((s) => s.apps)
  const confirmId = useMyPc((s) => s.confirmId)
  const { askClose, closeApp } = useMyPc.getState()
  const top = apps.reduce((m, a) => Math.max(m, a.memMb), 1)

  if (apps.length === 0) {
    return (
      <EmptyState
        icon={AppWindow}
        title="Nada pesado rodando"
        hint="Seu PC está tranquilo agora."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {apps.map((app) => {
        const confirming = confirmId === app.id
        return (
          <li
            key={app.id}
            className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-3 py-2"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-hover text-[12px] font-semibold text-accent">
              {app.name[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px]">{app.name}</span>
                <span className="shrink-0 font-mono text-[12px] text-muted tabular-nums">
                  {formatMem(app.memMb)} · {app.cpu}%
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-border-soft">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${(app.memMb / top) * 100}%` }}
                />
              </div>
            </div>
            {confirming ? (
              <div
                className="animate-rise-in flex shrink-0 items-center gap-1"
                role="group"
                aria-label={`Confirmar fechar ${app.name}`}
              >
                <Button
                  variant="danger"
                  className="px-2 py-1 text-[12px]"
                  onClick={() => closeApp(app.id)}
                >
                  Fechar?
                </Button>
                <IconButton label="Cancelar" onClick={() => askClose(null)} className="size-7">
                  <X className="size-3.5" />
                </IconButton>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="shrink-0 px-2 py-1 text-[12px]"
                onClick={() => askClose(app.id)}
              >
                Fechar
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
