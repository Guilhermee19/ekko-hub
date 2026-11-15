import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'

export type ClipKind = 'text' | 'link' | 'code' | 'image'

export interface Clip {
  id: string
  kind: ClipKind
  /** Text content; for images, a short description ("Captura de tela 1280×720"). */
  content: string
  /** App the item was copied from. */
  source: string
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

interface ClipboardState {
  clips: Clip[]
  snippets: Snippet[]
  copy: (text: string) => void
  togglePin: (id: string) => void
  remove: (id: string) => void
  /** Removes every unpinned item. */
  clearHistory: () => void
  saveSnippet: (s: Omit<Snippet, 'id'> & { id?: string }) => void
  removeSnippet: (id: string) => void
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
    source: 'Edge',
    at: min(9),
    pinned: false,
  },
  {
    id: 'c3',
    kind: 'code',
    content: 'const total = items.reduce((acc, i) => acc + i.price * i.qty, 0)',
    source: 'VS Code',
    at: min(26),
    pinned: false,
  },
  {
    id: 'c4',
    kind: 'image',
    content: 'Captura de tela 1280×720',
    source: 'Ferramenta de Captura',
    at: min(48),
    pinned: false,
  },
  {
    id: 'c5',
    kind: 'text',
    content: 'Código de rastreio: BR482130947BR',
    source: 'Mercado Livre',
    at: min(60 * 5),
    pinned: true,
  },
  {
    id: 'c6',
    kind: 'link',
    content: 'https://www.figma.com/file/ekko-hub-design',
    source: 'Figma',
    at: min(60 * 26),
    pinned: false,
  },
  {
    id: 'c7',
    kind: 'code',
    content: 'npm run check && cargo test --workspace',
    source: 'Terminal',
    at: min(60 * 50),
    pinned: false,
  },
]

const SNIPPETS: Snippet[] = [
  { id: 's1', name: 'E-mail pessoal', shortcut: ';email', content: 'guilherme@exemplo.com' },
  { id: 's2', name: 'Assinatura', shortcut: ';ass', content: 'Abraço,\nGuilherme' },
  { id: 's3', name: 'Endereço', shortcut: ';end', content: 'Rua das Flores, 123 – São Paulo, SP' },
]

/** Shows a short toast in the notch and clears it unless something replaced it. */
export function flashToast(text: string) {
  // Auto-clears: see TOAST_MS in stores/assistant.
  useAssistant.getState().set({ toast: text })
}

export const useClipboard = create<ClipboardState>((set, get) => ({
  clips: CLIPS,
  snippets: SNIPPETS,
  copy: () => flashToast('Copiado!'),
  togglePin: (id) =>
    set({ clips: get().clips.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }),
  remove: (id) => set({ clips: get().clips.filter((c) => c.id !== id) }),
  clearHistory: () => set({ clips: get().clips.filter((c) => c.pinned) }),
  saveSnippet: ({ id, ...data }) => {
    const { snippets } = get()
    if (id && snippets.some((s) => s.id === id)) {
      set({ snippets: snippets.map((s) => (s.id === id ? { ...s, ...data } : s)) })
    } else {
      set({ snippets: [...snippets, { id: crypto.randomUUID(), ...data }] })
    }
  },
  removeSnippet: (id) => set({ snippets: get().snippets.filter((s) => s.id !== id) }),
}))
