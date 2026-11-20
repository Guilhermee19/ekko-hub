import { create } from 'zustand'
import { backend, type ShelfMode, type ShelfSnapshot } from '@/lib/ipc'
import { flashToast } from '@/stores/assistant'
import { feel } from '@/stores/mood'

interface ShelfState extends ShelfSnapshot {
  /** Our own drag out is running (the notch must not "receive" those files). */
  draggingOut: boolean
  add: (paths: string[]) => void
  remove: (id: string) => void
  clear: () => void
  setMode: (mode: ShelfMode) => void
  /** Native drag of the given items, or everything. */
  dragOut: (ids?: string[]) => void
  open: (id: string) => void
  reveal: (id: string) => void
}

const apply = (s: ShelfSnapshot) => useShelf.setState({ mode: s.mode, items: s.items })
const fail = (err: unknown) => console.error('[ekko] prateleira:', err)
const run = (call: Promise<ShelfSnapshot>) => call.then(apply, fail)

/** Files waiting on the shelf; the list lives in the backend (shelf.json). */
export const useShelf = create<ShelfState>((set, get) => ({
  mode: 'copy',
  items: [],
  draggingOut: false,
  add: (paths) => {
    if (paths.length === 0) return
    const before = get().items.length
    backend.shelfAdd(paths).then((s) => {
      apply(s)
      const added = s.items.length - before
      if (added > 0) feel('excited')
      flashToast(
        added > 0
          ? `${added} ${added === 1 ? 'arquivo guardado' : 'arquivos guardados'} na prateleira`
          : 'Esses arquivos já estão na prateleira',
      )
    }, fail)
  },
  remove: (id) => void run(backend.shelfRemove([id])),
  clear: () => void run(backend.shelfClear()),
  setMode: (mode) => void run(backend.shelfSetMode(mode)),
  dragOut: (ids) => {
    if (get().draggingOut || get().items.length === 0) return
    set({ draggingOut: true })
    backend.shelfDragOut(ids).catch((err: unknown) => {
      set({ draggingOut: false })
      fail(err)
      flashToast('Não deu para arrastar agora')
    })
  },
  open: (id) => void backend.shelfOpen(id).catch(fail),
  reveal: (id) => void backend.shelfReveal(id).catch(fail),
}))

void run(backend.shelfList())
void backend.onShelfChanged(apply)
void backend.onShelfDragEnd(() => useShelf.setState({ draggingOut: false }))
