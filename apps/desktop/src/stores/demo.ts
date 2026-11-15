import { IDLE, useAssistant, type Presence } from './assistant'

// Scripted scenarios so the prototype shows every state without real AI/voice.

const later = (ms: number, fn: () => void) => window.setTimeout(fn, ms)
const put = (p: Partial<Presence>) => useAssistant.getState().set(p)

export const demo = {
  idle: () => put(IDLE),
  listening: () => put({ phase: 'listening', caption: 'Fale…', toast: null }),
  thinking: () => put({ phase: 'thinking', caption: 'Pensando…', toast: null }),
  speaking: () =>
    put({ phase: 'speaking', caption: 'Pronto! Timer de 5 minutos iniciado.', toast: null }),
  toast: () => put({ phase: 'idle', toast: 'Timer "5 min" de 5 minutos iniciado.' }),
  timer: () =>
    put({
      phase: 'idle',
      toast: null,
      activity: { kind: 'timer', label: '5 min', endsAt: Date.now() + 5 * 60_000, total: 300 },
    }),
  music: () =>
    put({
      phase: 'idle',
      toast: null,
      activity: {
        kind: 'music',
        title: 'Do I Wanna Know?',
        artist: 'Arctic Monkeys',
        playing: true,
      },
    }),
  volume: () => put({ phase: 'idle', toast: null, activity: { kind: 'volume', level: 0.62 } }),

  /** Full voice turn: listen → think → speak → toast → live timer. */
  conversation: () => {
    put({ phase: 'listening', caption: 'Ei Ekko, timer de 5 minutos', toast: null, activity: null })
    later(1800, demo.thinking)
    later(3000, demo.speaking)
    later(5200, demo.toast)
    later(7800, demo.timer)
  },
}

export type DemoKey = keyof typeof demo

export const DEMO_LABELS: Record<DemoKey, string> = {
  idle: 'Repouso',
  listening: 'Ouvindo',
  thinking: 'Pensando',
  speaking: 'Falando',
  toast: 'Aviso',
  timer: 'Timer',
  music: 'Música',
  volume: 'Volume',
  conversation: '▶ Conversa completa',
}
