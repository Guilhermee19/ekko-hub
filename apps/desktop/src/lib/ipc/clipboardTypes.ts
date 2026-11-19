import type { Unlisten } from './types'

// Mirrors crates/ekko-core/src/clipboard.rs + commands/clipboard.rs.

export const CLIPBOARD_CHANGED = 'ekko://clipboard/changed'

/** `image` only exists in the sample data for now; the real history is text. */
export type ClipKind = 'text' | 'link' | 'code' | 'image'

export interface Clip {
  id: string
  kind: ClipKind
  /** Text content; for images, a short description ("Captura de tela 1280×720"). */
  content: string
  /** App the item was copied from. */
  source: string
  /** Last time it was copied, epoch ms. */
  at: number
  pinned: boolean
}

export interface Snippet {
  id: string
  name: string
  /** Text expansion trigger, e.g. ";email". */
  shortcut: string
  content: string
}

export type SnippetInput = Omit<Snippet, 'id'> & { id?: string }

export interface ClipboardSnapshot {
  /** While true nothing new is recorded. */
  paused: boolean
  /** Newest first. */
  clips: Clip[]
  snippets: Snippet[]
}

export interface ClipboardBackend {
  clipboardList(): Promise<ClipboardSnapshot>
  onClipboardChanged(cb: (s: ClipboardSnapshot) => void): Promise<Unlisten>
  /** Puts text on the clipboard (it then moves to the top of the history). */
  clipboardCopy(text: string): Promise<void>
  clipboardPin(id: string): Promise<ClipboardSnapshot>
  clipboardRemove(id: string): Promise<ClipboardSnapshot>
  /** Removes every unpinned item. */
  clipboardClear(): Promise<ClipboardSnapshot>
  clipboardPause(paused: boolean): Promise<ClipboardSnapshot>
  snippetSave(snippet: SnippetInput): Promise<ClipboardSnapshot>
  snippetRemove(id: string): Promise<ClipboardSnapshot>
}
