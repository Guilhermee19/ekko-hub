import {
  CLIPBOARD_CHANGED,
  type Clip,
  type ClipboardBackend,
  type ClipboardSnapshot,
  type Snippet,
} from './clipboardTypes'
import type { Unlisten } from './types'

// Browser gallery: sample history in memory, same contract as commands/clipboard.rs.

interface Bus {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
}

const min = (n: number) => Date.now() - n * 60_000

const CLIPS: Clip[] = [
  {
    id: 'c1',
    kind: 'text',
    content: 'Reunião remarcada para quinta às 15h, sala 2.',
    source: 'WhatsApp',
    at: min(2),
    pinned: false,
  },
  {
    id: 'c2',
    kind: 'link',
    content: 'https://github.com/tauri-apps/tauri/releases',
    source: 'Microsoft Edge',
    at: min(9),
    pinned: false,
  },
  {
    id: 'c3',
    kind: 'code',
    content: 'const total = items.reduce((acc, i) => acc + i.price * i.qty, 0)',
    source: 'Visual Studio Code',
    at: min(26),
    pinned: false,
  },
  {
    id: 'c4',
    kind: 'text',
    content: 'Código de rastreio: BR482130947BR',
    source: 'Mercado Livre',
    at: min(60 * 5),
    pinned: true,
  },
  {
    id: 'c5',
    kind: 'code',
    content: 'npm run check && cargo test --workspace',
    source: 'Terminal',
    at: min(60 * 50),
    pinned: false,
  },
]

const SNIPPETS: Snippet[] = [
  { id: 's1', name: 'E-mail pessoal', shortcut: ';email', content: 'guilherme@exemplo.com' },
  { id: 's2', name: 'Assinatura', shortcut: ';ass', content: 'Abraço,\nAna' },
]

export function mockClipboard({ on, fire }: Bus): ClipboardBackend {
  let state: ClipboardSnapshot = { paused: false, clips: CLIPS, snippets: SNIPPETS }
  const commit = (next: Partial<ClipboardSnapshot>) => {
    state = { ...state, ...next }
    fire(CLIPBOARD_CHANGED, state)
    return Promise.resolve(state)
  }
  return {
    clipboardList: () => Promise.resolve(state),
    onClipboardChanged: (cb) => on(CLIPBOARD_CHANGED, (s) => cb(s as ClipboardSnapshot)),
    clipboardCopy: (text) => {
      const old = state.clips.find((c) => c.content === text)
      const clip: Clip = old
        ? { ...old, at: Date.now() }
        : {
            id: crypto.randomUUID(),
            kind: 'text',
            content: text,
            source: 'Ekko',
            at: Date.now(),
            pinned: false,
          }
      return commit({ clips: [clip, ...state.clips.filter((c) => c.id !== clip.id)] }).then(
        () => {},
      )
    },
    clipboardPin: (id) =>
      commit({ clips: state.clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }),
    clipboardRemove: (id) => commit({ clips: state.clips.filter((c) => c.id !== id) }),
    clipboardClear: () => commit({ clips: state.clips.filter((c) => c.pinned) }),
    clipboardPause: (paused) => commit({ paused }),
    snippetSave: ({ id, ...data }) => {
      const exists = id !== undefined && state.snippets.some((s) => s.id === id)
      return commit({
        snippets: exists
          ? state.snippets.map((s) => (s.id === id ? { ...s, ...data } : s))
          : [...state.snippets, { id: crypto.randomUUID(), ...data }],
      })
    },
    snippetRemove: (id) => commit({ snippets: state.snippets.filter((s) => s.id !== id) }),
  }
}
