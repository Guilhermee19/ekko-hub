import type { Unlisten } from './types'

// Mirrors crates/ekko-core/src/clipboard.rs + commands/clipboard.rs.

export const CLIPBOARD_CHANGED = 'ekko://clipboard/changed'

/** How many unpinned items Copiados may keep (Configurações → Geral). */
export const CLIPBOARD_LIMITS = [20, 50, 100, 200] as const

export type ClipKind = 'text' | 'link' | 'code' | 'image' | 'files'

export interface Clip {
  id: string
  kind: ClipKind
  /** The text; for images and files, a description ("Imagem 1280×720", "a.pdf, b.png"). */
  content: string
  /** App the item was copied from. */
  source: string
  /** Last time it was copied, epoch ms. */
  at: number
  pinned: boolean
  /** Images: path of the saved PNG. */
  image?: string
  /** Files: the copied paths (the files stay where they are). */
  files?: string[]
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
  /** Unpinned items kept (one of CLIPBOARD_LIMITS). */
  limit: number
  /** Newest first. */
  clips: Clip[]
  snippets: Snippet[]
}

export interface ClipboardBackend {
  clipboardList(): Promise<ClipboardSnapshot>
  onClipboardChanged(cb: (s: ClipboardSnapshot) => void): Promise<Unlisten>
  /** Puts text on the clipboard (snippets). */
  clipboardCopy(text: string): Promise<void>
  /** Puts a history item back (text, image or files); it moves to the top. */
  clipboardCopyItem(id: string): Promise<void>
  clipboardSetLimit(limit: number): Promise<ClipboardSnapshot>
  /** URL the webview can show for a saved image; null when there is none. */
  clipboardImageUrl(clip: Clip): string | null
  clipboardPin(id: string): Promise<ClipboardSnapshot>
  clipboardRemove(id: string): Promise<ClipboardSnapshot>
  /** Removes every unpinned item. */
  clipboardClear(): Promise<ClipboardSnapshot>
  clipboardPause(paused: boolean): Promise<ClipboardSnapshot>
  snippetSave(snippet: SnippetInput): Promise<ClipboardSnapshot>
  snippetRemove(id: string): Promise<ClipboardSnapshot>
}
