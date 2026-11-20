import { create } from 'zustand'
import { backend, type ClipboardSnapshot, type SnippetInput } from '@/lib/ipc'
import { flashToast } from '@/stores/assistant'

export type { Clip, ClipKind, Snippet } from '@/lib/ipc'

interface ClipboardState extends ClipboardSnapshot {
  /** Snippets: puts the text on the clipboard. */
  copy: (text: string) => void
  /** History: puts the item back as it was copied (text, image or files). */
  copyItem: (id: string) => void
  setLimit: (limit: number) => void
  togglePin: (id: string) => void
  remove: (id: string) => void
  /** Removes every unpinned item. */
  clearHistory: () => void
  setPaused: (paused: boolean) => void
  saveSnippet: (s: SnippetInput) => void
  removeSnippet: (id: string) => void
}

const apply = (s: ClipboardSnapshot) =>
  useClipboard.setState({
    paused: s.paused,
    limit: s.limit,
    clips: s.clips,
    snippets: s.snippets,
  })

const run = (call: Promise<ClipboardSnapshot>) =>
  call.then(apply, (err: unknown) => console.error('[ekko] copiados:', err))

/** History and snippets live in the backend (clipboard.json); this mirrors them. */
export const useClipboard = create<ClipboardState>(() => ({
  paused: false,
  limit: 50,
  clips: [],
  snippets: [],
  copy: (text) => {
    backend.clipboardCopy(text).then(
      () => flashToast('Copiado!'),
      () => flashToast('Não deu para copiar agora, tente de novo'),
    )
  },
  copyItem: (id) => {
    backend.clipboardCopyItem(id).then(
      () => flashToast('Copiado!'),
      (err: unknown) => flashToast(err instanceof Error ? err.message : String(err)),
    )
  },
  setLimit: (limit) => void run(backend.clipboardSetLimit(limit)),
  togglePin: (id) => void run(backend.clipboardPin(id)),
  remove: (id) => void run(backend.clipboardRemove(id)),
  clearHistory: () => void run(backend.clipboardClear()),
  setPaused: (paused) => void run(backend.clipboardPause(paused)),
  saveSnippet: (s) => void run(backend.snippetSave(s)),
  removeSnippet: (id) => void run(backend.snippetRemove(id)),
}))

// Sync once per window: initial snapshot, then every change (new copies included).
void run(backend.clipboardList())
void backend.onClipboardChanged(apply)
