import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { SHELF_CHANGED, SHELF_DRAG_END, type ShelfBackend, type ShelfSnapshot } from './shelfTypes'

export const tauriShelf: ShelfBackend = {
  shelfList: () => invoke('shelf_list'),
  onShelfChanged: (cb) => listen<ShelfSnapshot>(SHELF_CHANGED, (e) => cb(e.payload)),
  shelfAdd: (paths) => invoke('shelf_add', { paths }),
  shelfRemove: (ids) => invoke('shelf_remove', { ids }),
  shelfClear: () => invoke('shelf_clear'),
  shelfSetMode: (mode) => invoke('shelf_set_mode', { mode }),
  shelfDragOut: (ids) => invoke('shelf_drag_out', { ids: ids ?? null }),
  onShelfDragEnd: (cb) => listen(SHELF_DRAG_END, () => cb()),
  shelfOpen: (id) => invoke('shelf_open', { id }),
  shelfReveal: (id) => invoke('shelf_reveal', { id }),
  onFileDrop: (cb) =>
    getCurrentWebview().onDragDropEvent(({ payload: p }) => {
      if (p.type === 'enter' || p.type === 'drop') cb({ type: p.type, paths: p.paths })
      else if (p.type === 'leave') cb({ type: 'leave' })
    }),
}
