import { create } from 'zustand'
import { useAssistant, type Presence } from '@/stores/assistant'
import { pickReply } from './replies'

// Mock chat for F1b. Streaming is simulated with timers kept outside React, and it
// drives the global presence so the notch pill reacts like a real turn.

export type ActionStatus = 'ok' | 'confirm' | 'error' | 'cancelled'

export type Message =
  | { id: string; role: 'user'; text: string; screenshot?: boolean }
  | { id: string; role: 'assistant'; text: string; streaming?: boolean; stopped?: boolean }
  | { id: string; role: 'action'; tool: string; detail: string; status: ActionStatus }

interface ChatState {
  messages: Message[]
  streaming: boolean
  /** Screenshot chip waiting in the composer. */
  screenshot: boolean
  send: (text: string) => void
  stop: () => void
  toggleScreenshot: () => void
  resolveAction: (id: string, confirmed: boolean) => void
  clear: () => void
}

const SEED: Message[] = [
  { id: 's1', role: 'user', text: 'Ekko, timer de 25 minutos pro foco' },
  { id: 's2', role: 'action', tool: 'timer.start', detail: '25 min', status: 'ok' },
  {
    id: 's3',
    role: 'assistant',
    text: 'Pronto! Timer de 25 minutos iniciado. Te aviso quando acabar, bom foco.',
  },
]

const THINK_MS = 900
const WORD_MS = 70

let seq = 0
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`
const put = (p: Partial<Presence>) => useAssistant.getState().set(p)

let timers: number[] = []
const clearTimers = () => {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

export const useChat = create<ChatState>((set, get) => {
  const patch = (id: string, fn: (m: Message) => Message) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }))
  const append = (m: Message) => set((s) => ({ messages: [...s.messages, m] }))

  const finish = () => {
    clearTimers()
    set({ streaming: false })
    put({ phase: 'idle', caption: '' })
  }

  const streamReply = (text: string) => {
    const id = nextId()
    const words = text.split(' ')
    append({ id, role: 'assistant', text: '', streaming: true })
    put({ phase: 'speaking', caption: text })
    words.forEach((_, i) => {
      timers.push(
        window.setTimeout(
          () => {
            const partial = words.slice(0, i + 1).join(' ')
            const done = i === words.length - 1
            patch(id, (m) => ({ ...m, text: partial, streaming: !done }))
            if (done) timers.push(window.setTimeout(finish, 600))
          },
          (i + 1) * WORD_MS,
        ),
      )
    })
  }

  return {
    messages: SEED,
    streaming: false,
    screenshot: false,

    send: (raw) => {
      const text = raw.trim()
      const { streaming, screenshot } = get()
      if (streaming || (!text && !screenshot)) return
      const shown = text || 'O que tem na minha tela?'
      append({ id: nextId(), role: 'user', text: shown, screenshot })
      set({ streaming: true, screenshot: false })
      put({ phase: 'thinking', caption: 'Pensando…', toast: null })

      const reply = pickReply(shown, screenshot)
      timers.push(
        window.setTimeout(() => {
          if (reply.action) append({ id: nextId(), role: 'action', ...reply.action })
          if (reply.action?.tool === 'timer.start' && reply.action.status === 'ok') {
            const min = Number.parseInt(reply.action.detail, 10) || 5
            put({
              activity: {
                kind: 'timer',
                label: reply.action.detail,
                endsAt: Date.now() + min * 60_000,
                total: min * 60,
              },
            })
          }
          streamReply(reply.text)
        }, THINK_MS),
      )
    },

    stop: () => {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.role === 'assistant' && m.streaming ? { ...m, streaming: false, stopped: true } : m,
        ),
      }))
      finish()
    },

    toggleScreenshot: () => set((s) => ({ screenshot: !s.screenshot })),

    resolveAction: (id, confirmed) => {
      const action = get().messages.find((m) => m.id === id)
      if (action?.role !== 'action' || action.status !== 'confirm') return
      patch(id, (m) => (m.role === 'action' ? { ...m, status: confirmed ? 'ok' : 'cancelled' } : m))
      const done = `${action.detail} aberto.`
      append({
        id: nextId(),
        role: 'assistant',
        text: confirmed ? `Feito, ${done}` : 'Tudo bem, deixei como estava.',
      })
      put({ toast: confirmed ? done : null })
    },

    clear: () => {
      get().stop()
      set({ messages: [], screenshot: false })
    },
  }
})
