import { ShieldAlert, ShieldQuestion, Undo2 } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
import {
  HOLD_MS,
  UNDO_MS,
  holdLeft,
  requestConfirm,
  useConfirm,
  type PendingConfirm,
  type UndoOffer,
} from '@/stores/confirm'
import { useLatest } from '@/surfaces/shared/useOverlay'
import { useNow } from '@/surfaces/shared/useNow'
import { Badge } from './data'
import { Button, Kbd } from './primitives'

const toast = (text: string) => useAssistant.getState().set({ toast: text })

/** Mount once per window: shows the queued confirmation and the undo snackbar. */
export function ConfirmHost() {
  const current = useConfirm((s) => s.queue[0])
  const undo = useConfirm((s) => s.undo)
  return (
    <>
      {current && <ConfirmDialog key={current.id} req={current} />}
      {undo && <UndoSnackbar key={undo.id} offer={undo} />}
    </>
  )
}

function ConfirmDialog({ req }: { req: PendingConfirm }) {
  const answer = useConfirm((s) => s.answer)
  const titleId = useId()
  const detailId = useId()
  const dangerous = req.risk === 'dangerous'
  const now = useNow(dangerous, 100)
  const cardRef = useRef<HTMLDivElement>(null)
  // Dangerous: "Confirmar" is on hold, so focus the card; Enter works once the hold ends.
  useEffect(() => {
    if (dangerous) cardRef.current?.focus()
  }, [dangerous])
  const left = holdLeft(req, Math.max(now, req.shownAt))
  const ready = left === 0
  const onKey = useLatest((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      answer(false)
      // A focused button already handles Enter natively.
    } else if (
      e.key === 'Enter' &&
      ready &&
      !(document.activeElement instanceof HTMLButtonElement)
    ) {
      e.preventDefault()
      answer(true)
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey.current(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey])

  const Icon = dangerous ? ShieldAlert : ShieldQuestion
  return (
    <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-base/70 p-4 backdrop-blur-sm">
      <div
        ref={cardRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        className={cn(
          'animate-rise-in w-full max-w-sm rounded-2xl border bg-surface p-4 shadow-2xl outline-none',
          dangerous ? 'border-danger/40' : 'border-accent/30',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              dangerous ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent',
            )}
          >
            <Icon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="label-hud">Confirmar ação</span>
              <Badge tone={dangerous ? 'danger' : 'accent'}>
                {dangerous ? 'Perigosa' : 'Pede confirmação'}
              </Badge>
            </div>
            <h2 id={titleId} className="text-[15px] font-semibold">
              {req.title}
            </h2>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border-soft bg-base/60 p-2.5">
          <div className="font-mono text-[11px] text-accent">{req.tool}</div>
          <p id={detailId} className="mt-1 text-[12px] text-muted">
            {req.detail}
          </p>
        </div>
        {req.undoable && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
            <Undo2 className="size-3" /> Dá para desfazer logo depois.
          </p>
        )}

        {dangerous && (
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-border-soft" aria-hidden>
            <div
              className="h-full bg-danger transition-[width] duration-100 ease-linear"
              style={{ width: `${((HOLD_MS - left) / HOLD_MS) * 100}%` }}
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => answer(false)}>
            Cancelar <Kbd>Esc</Kbd>
          </Button>
          <Button
            autoFocus={!dangerous}
            variant={dangerous ? 'danger' : 'primary'}
            disabled={!ready}
            onClick={() => answer(true)}
            aria-live="polite"
          >
            {ready ? (req.confirmLabel ?? 'Confirmar') : `Aguarde ${Math.ceil(left / 1000)}s`}
            {ready && <Kbd>Enter</Kbd>}
          </Button>
        </div>
      </div>
    </div>
  )
}

function UndoSnackbar({ offer }: { offer: UndoOffer }) {
  const undoLast = useConfirm((s) => s.undoLast)
  const dismiss = useConfirm((s) => s.dismissUndo)
  const now = useNow(true, 200)
  const left = Math.max(0, offer.expiresAt - now)
  const onUndo = () => {
    const custom = Boolean(offer.onUndo)
    undoLast()
    if (!custom) toast('Desfeito')
  }
  return (
    <div
      role="status"
      className="glass animate-rise-in fixed bottom-4 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 overflow-hidden rounded-xl"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="min-w-0 flex-1 truncate text-[12px]">
          <span className="text-muted">Feito: </span>
          {offer.title}
        </span>
        <Button size="sm" variant="subtle" onClick={onUndo}>
          <Undo2 className="size-3.5" /> Desfazer
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Fechar aviso">
          OK
        </Button>
      </div>
      <div className="h-0.5 bg-border-soft" aria-hidden>
        <div className="h-full bg-accent" style={{ width: `${(left / UNDO_MS) * 100}%` }} />
      </div>
    </div>
  )
}

/** Gallery/demo: one dangerous request followed by an undoable one. */
export async function demoConfirm(): Promise<void> {
  const closed = await requestConfirm({
    title: 'Fechar o Chrome (2,1 GB)',
    detail: 'Encerra o Google Chrome e todas as abas abertas. Abas não salvas serão perdidas.',
    tool: 'apps.close',
    risk: 'dangerous',
    confirmLabel: 'Fechar',
  })
  toast(closed ? 'Chrome fechado' : 'Tudo bem, deixei o Chrome aberto')
  await requestConfirm({
    title: 'Organizar a área de trabalho',
    detail: 'Move 23 arquivos soltos para pastas por tipo (Imagens, Documentos, Instaladores).',
    tool: 'files.organize_desktop',
    risk: 'confirm',
    confirmLabel: 'Organizar',
    undoable: true,
    onUndo: () => toast('Desfeito: arquivos de volta no lugar'),
  })
}
