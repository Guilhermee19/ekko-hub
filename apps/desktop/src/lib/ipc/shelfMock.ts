import {
  SHELF_CHANGED,
  SHELF_DRAG_END,
  type FileDropEvent,
  type ShelfBackend,
  type ShelfItem,
  type ShelfSnapshot,
} from './shelfTypes'
import type { Unlisten } from './types'

// Browser gallery: files dropped on the page become fake shelf items (the browser
// hides real paths), so the notch drop zone and tray can be tried without Tauri.

interface Bus {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
}

function item(name: string, size: number): ShelfItem {
  return {
    id: crypto.randomUUID(),
    path: `C:\\Users\\voce\\Downloads\\${name}`,
    name,
    isDir: !name.includes('.'),
    size,
    addedAt: Date.now(),
  }
}

/** HTML5 drag events → FileDropEvent; `dragleave` fires per child, so count depth. */
function listenFiles(cb: (e: FileDropEvent) => void): Promise<Unlisten> {
  let depth = 0
  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
  const enter = (e: DragEvent) => {
    if (!hasFiles(e)) return
    if (depth++ === 0) cb({ type: 'enter', paths: [] })
  }
  const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
  const leave = (e: DragEvent) => {
    if (hasFiles(e) && --depth === 0) cb({ type: 'leave' })
  }
  const drop = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth = 0
    const names = Array.from(e.dataTransfer?.files ?? [], (f) => f.name)
    cb({ type: 'drop', paths: names })
  }
  const pairs = [
    ['dragenter', enter],
    ['dragover', over],
    ['dragleave', leave],
    ['drop', drop],
  ] as const
  pairs.forEach(([name, fn]) => window.addEventListener(name, fn))
  return Promise.resolve(() => pairs.forEach(([name, fn]) => window.removeEventListener(name, fn)))
}

export function mockShelf({ on, fire }: Bus): ShelfBackend {
  let state: ShelfSnapshot = {
    mode: 'copy',
    items: [item('relatorio-q3.pdf', 482_133), item('capa.png', 1_204_551)],
  }
  const commit = (next: Partial<ShelfSnapshot>) => {
    state = { ...state, ...next }
    fire(SHELF_CHANGED, state)
    return Promise.resolve(state)
  }
  const done = () => Promise.resolve()
  return {
    // No real files in the browser: a gradient stands in for the photo.
    shelfPreviewUrl: (it) => {
      const hue = [...it.name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 70% 55%)"/><stop offset="1" stop-color="hsl(${hue + 60} 70% 30%)"/></linearGradient></defs><rect width="4" height="3" fill="url(#g)"/><circle cx="3" cy=".8" r=".4" fill="#fff8"/></svg>`
      return `data:image/svg+xml,${encodeURIComponent(svg)}`
    },
    shelfList: () => Promise.resolve(state),
    onShelfChanged: (cb) => on(SHELF_CHANGED, (s) => cb(s as ShelfSnapshot)),
    shelfAdd: (paths) => {
      const fresh = paths
        .filter((p) => !state.items.some((i) => i.path.endsWith(`\\${p}`)))
        .map((p) => item(p, 64_000))
      return commit({ items: [...state.items, ...fresh] })
    },
    shelfRemove: (ids) => commit({ items: state.items.filter((i) => !ids.includes(i.id)) }),
    shelfClear: () => commit({ items: [] }),
    shelfSetMode: (mode) => commit({ mode }),
    shelfDragOut: () => {
      fire(SHELF_DRAG_END, 'none')
      return done()
    },
    onShelfDragEnd: (cb) => on(SHELF_DRAG_END, () => cb()),
    shelfOpen: done,
    shelfReveal: done,
    onFileDrop: listenFiles,
  }
}
