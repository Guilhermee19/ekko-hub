import type { Unlisten } from './types'

// Mirrors crates/ekko-core/src/shelf.rs + commands/shelf.rs.

export const SHELF_CHANGED = 'ekko://shelf/changed'
export const SHELF_DRAG_END = 'ekko://shelf/drag-end'

/** What dragging out does to the files. */
export type ShelfMode = 'copy' | 'move'

export interface ShelfItem {
  id: string
  /** Absolute path of the original (nothing is copied into Ekko). */
  path: string
  name: string
  isDir: boolean
  /** Bytes; 0 for folders. */
  size: number
  addedAt: number
}

export interface ShelfSnapshot {
  mode: ShelfMode
  /** In the order they were dropped. */
  items: ShelfItem[]
}

/** Files dragged over this window from Explorer (or any app). */
export type FileDropEvent =
  { type: 'enter'; paths: string[] } | { type: 'drop'; paths: string[] } | { type: 'leave' }

export interface ShelfBackend {
  shelfList(): Promise<ShelfSnapshot>
  onShelfChanged(cb: (s: ShelfSnapshot) => void): Promise<Unlisten>
  shelfAdd(paths: string[]): Promise<ShelfSnapshot>
  shelfRemove(ids: string[]): Promise<ShelfSnapshot>
  shelfClear(): Promise<ShelfSnapshot>
  shelfSetMode(mode: ShelfMode): Promise<ShelfSnapshot>
  /** Native drag out of this window; `ids` omitted = everything. */
  shelfDragOut(ids?: string[]): Promise<void>
  /** Fires when a drag out ends (dropped, cancelled or failed). */
  onShelfDragEnd(cb: () => void): Promise<Unlisten>
  shelfOpen(id: string): Promise<void>
  shelfReveal(id: string): Promise<void>
  onFileDrop(cb: (e: FileDropEvent) => void): Promise<Unlisten>
}
