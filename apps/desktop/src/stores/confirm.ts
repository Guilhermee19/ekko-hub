import { create } from 'zustand'

// Risky-tool confirmation queue. Any code (palette, chat, routines) awaits
// `requestConfirm(...)`; the single `ConfirmHost` shows one request at a time.

export type Risk = 'confirm' | 'dangerous'

export interface ConfirmRequest {
  title: string
  detail: string
  /** Tool id shown in mono ("apps.close"). */
  tool: string
  risk: Risk
  confirmLabel?: string
  /** After confirming, offer "Desfazer" for UNDO_MS. */
  undoable?: boolean
  /** Called when the user hits "Desfazer". */
  onUndo?: () => void
}

export interface PendingConfirm extends ConfirmRequest {
  id: number
  /** When it became the visible request; the dangerous hold counts from here. */
  shownAt: number
  resolve: (ok: boolean) => void
}

export interface UndoOffer {
  id: number
  title: string
  expiresAt: number
  onUndo?: () => void
}

interface ConfirmState {
  queue: PendingConfirm[]
  undo: UndoOffer | null
  /** Settles the visible request. */
  answer: (ok: boolean) => void
  /** Runs the undo callback of the current offer and closes it. */
  undoLast: () => void
  dismissUndo: () => void
}

/** Dangerous actions keep "Confirmar" disabled this long. */
export const HOLD_MS = 3000
export const UNDO_MS = 6000

/** Ms left before a dangerous request can be confirmed (0 = ready). */
export function holdLeft(req: Pick<PendingConfirm, 'risk' | 'shownAt'>, now: number): number {
  if (req.risk !== 'dangerous') return 0
  return Math.max(0, req.shownAt + HOLD_MS - now)
}

let seq = 0
let undoTimer: ReturnType<typeof setTimeout> | undefined

export const useConfirm = create<ConfirmState>((set, get) => ({
  queue: [],
  undo: null,
  answer: (ok) => {
    const [head, ...rest] = get().queue
    if (!head) return
    if (!ok || holdLeft(head, Date.now()) === 0) {
      const now = Date.now()
      // The next request starts its own hold only when it is shown.
      set({ queue: rest.map((r, i) => (i === 0 ? { ...r, shownAt: now } : r)) })
      if (ok && head.undoable) offerUndo(head)
      head.resolve(ok)
    }
  },
  undoLast: () => {
    const offer = get().undo
    if (!offer) return
    clearTimeout(undoTimer)
    set({ undo: null })
    offer.onUndo?.()
  },
  dismissUndo: () => {
    clearTimeout(undoTimer)
    set({ undo: null })
  },
}))

function offerUndo(req: PendingConfirm) {
  clearTimeout(undoTimer)
  const offer: UndoOffer = {
    id: req.id,
    title: req.title,
    expiresAt: Date.now() + UNDO_MS,
    onUndo: req.onUndo,
  }
  useConfirm.setState({ undo: offer })
  undoTimer = setTimeout(() => {
    if (useConfirm.getState().undo?.id === offer.id) useConfirm.setState({ undo: null })
  }, UNDO_MS)
}

/** Queues a confirmation; resolves true when confirmed, false when cancelled. */
export function requestConfirm(req: ConfirmRequest): Promise<boolean> {
  return new Promise((resolve) => {
    const { queue } = useConfirm.getState()
    const pending: PendingConfirm = { ...req, id: ++seq, shownAt: Date.now(), resolve }
    useConfirm.setState({ queue: [...queue, pending] })
  })
}
