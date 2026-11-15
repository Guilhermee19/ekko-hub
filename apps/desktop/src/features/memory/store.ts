import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'

// Feature-local mock of what Ekko remembers. F4 (memória) replaces it with the backend store.

export const CATEGORIES = ['Pessoal', 'Preferências', 'Trabalho', 'Rotina'] as const
export type Category = (typeof CATEGORIES)[number]

export interface Fact {
  id: string
  category: Category
  text: string
  /** Where Ekko learned it ("da conversa de ontem"). */
  source: string
}

export interface Note {
  id: string
  title: string
  excerpt: string
  tags: string[]
  /** ISO date. */
  date: string
}

export type MemoryTab = 'facts' | 'notes' | 'map'

interface MemoryState {
  tab: MemoryTab
  facts: Fact[]
  notes: Note[]
  paused: boolean
  setTab: (tab: MemoryTab) => void
  addFact: (text: string, category: Category) => void
  updateFact: (id: string, text: string) => void
  forgetFact: (id: string) => void
  setPaused: (paused: boolean) => void
}

const FACTS: Fact[] = [
  {
    id: 'f1',
    category: 'Pessoal',
    text: 'Seu nome é Guilherme',
    source: 'da configuração inicial',
  },
  { id: 'f2', category: 'Pessoal', text: 'Mora em Belo Horizonte', source: 'da conversa de ontem' },
  { id: 'f3', category: 'Pessoal', text: 'Aniversário em 12 de março', source: 'você me ensinou' },
  {
    id: 'f4',
    category: 'Preferências',
    text: 'Gosta de lo-fi para focar',
    source: 'da conversa de ontem',
  },
  {
    id: 'f5',
    category: 'Preferências',
    text: 'Prefere respostas curtas',
    source: 'percebi nas últimas conversas',
  },
  {
    id: 'f6',
    category: 'Preferências',
    text: 'Tema escuro sempre',
    source: 'das suas configurações',
  },
  { id: 'f7', category: 'Trabalho', text: 'Usa VS Code e Rust', source: 'dos programas abertos' },
  {
    id: 'f8',
    category: 'Trabalho',
    text: 'Está construindo o Ekko Hub',
    source: 'da conversa de segunda',
  },
  {
    id: 'f9',
    category: 'Rotina',
    text: 'Faz pausa para o café às 15h',
    source: 'percebi na sua rotina',
  },
  {
    id: 'f10',
    category: 'Rotina',
    text: 'Treina às terças e quintas',
    source: 'da conversa de 3 dias atrás',
  },
]

const NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Ideias para o Ekko',
    excerpt:
      'Modo foco com lo-fi automático; resumo do dia às 18h; atalho para fechar tudo antes de jogar.',
    tags: ['ekko', 'ideias'],
    date: '2026-11-14',
  },
  {
    id: 'n2',
    title: 'Lista do mercado',
    excerpt: 'Café, aveia, banana, pão de queijo congelado, detergente.',
    tags: ['casa'],
    date: '2026-11-13',
  },
  {
    id: 'n3',
    title: 'Reunião com o time',
    excerpt: 'Fechar escopo da F1b até sexta. Revisar o design do notch e as cores das personas.',
    tags: ['trabalho', 'reunião'],
    date: '2026-11-11',
  },
  {
    id: 'n4',
    title: 'Livros para ler',
    excerpt: '“Rápido e devagar”, “O programador pragmático”, “Hábitos atômicos”.',
    tags: ['leitura'],
    date: '2026-11-02',
  },
]

const toast = (text: string) => useAssistant.getState().set({ toast: text })

let seq = 0

export const useMemory = create<MemoryState>((set) => ({
  tab: 'facts',
  facts: FACTS,
  notes: NOTES,
  paused: false,
  setTab: (tab) => set({ tab }),
  addFact: (text, category) => {
    const clean = text.trim()
    if (!clean) return
    const fact: Fact = {
      id: `new-${++seq}`,
      category,
      text: clean,
      source: 'você me ensinou agora',
    }
    set((s) => ({ facts: [fact, ...s.facts] }))
    toast('Anotado! Vou lembrar disso.')
  },
  updateFact: (id, text) => {
    const clean = text.trim()
    if (!clean) return
    set((s) => ({ facts: s.facts.map((f) => (f.id === id ? { ...f, text: clean } : f)) }))
  },
  forgetFact: (id) => {
    set((s) => ({ facts: s.facts.filter((f) => f.id !== id) }))
    toast('Esquecido')
  },
  setPaused: (paused) => {
    set({ paused })
    toast(paused ? 'Memória pausada' : 'Memória ligada')
  },
}))

/** Facts grouped by category, in CATEGORIES order, skipping empty groups. */
export function groupFacts(facts: Fact[]): { category: Category; facts: Fact[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    facts: facts.filter((f) => f.category === category),
  })).filter((g) => g.facts.length > 0)
}

/** Case/accent-insensitive search over title, excerpt and tags. */
export function filterNotes(notes: Note[], query: string): Note[] {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const q = norm(query.trim())
  if (!q) return notes
  return notes.filter((n) => norm([n.title, n.excerpt, ...n.tags].join(' ')).includes(q))
}
