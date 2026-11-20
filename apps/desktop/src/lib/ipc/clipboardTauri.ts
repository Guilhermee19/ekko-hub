import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { CLIPBOARD_CHANGED, type ClipboardBackend, type ClipboardSnapshot } from './clipboardTypes'

export const tauriClipboard: ClipboardBackend = {
  clipboardList: () => invoke('clipboard_list'),
  onClipboardChanged: (cb) => listen<ClipboardSnapshot>(CLIPBOARD_CHANGED, (e) => cb(e.payload)),
  clipboardCopy: (text) => invoke('clipboard_copy', { text }),
  clipboardCopyItem: (id) => invoke('clipboard_copy_item', { id }),
  clipboardSetLimit: (limit) => invoke('clipboard_set_limit', { limit }),
  // The backend allows only its own folder of copied images on the asset protocol.
  clipboardImageUrl: (clip) => (clip.image ? convertFileSrc(clip.image) : null),
  clipboardPin: (id) => invoke('clipboard_pin', { id }),
  clipboardRemove: (id) => invoke('clipboard_remove', { id }),
  clipboardClear: () => invoke('clipboard_clear'),
  clipboardPause: (paused) => invoke('clipboard_pause', { paused }),
  snippetSave: ({ id, ...rest }) =>
    invoke('snippet_save', { snippet: { ...rest, id: id ?? null } }),
  snippetRemove: (id) => invoke('snippet_remove', { id }),
}
