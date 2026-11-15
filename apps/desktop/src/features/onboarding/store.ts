import { create } from 'zustand'

// Choices made during onboarding that the backend does not store yet (F2/F3 will).

export type BrainMode = 'auto' | 'choose' | 'local'
export type MicCheck = 'idle' | 'testing' | 'ok' | 'skipped'

/** Length of the fake mic check. */
export const MIC_TEST_MS = 3500

interface OnboardingState {
  /** Name drafts; null = not edited, show the current settings. */
  userName: string | null
  assistantName: string | null
  brain: BrainMode
  wakeWord: boolean
  mic: MicCheck
  setNames: (patch: { userName?: string; assistantName?: string }) => void
  setBrain: (brain: BrainMode) => void
  setWakeWord: (on: boolean) => void
  startMicTest: () => void
  skipMic: () => void
}

let micTimer: ReturnType<typeof setTimeout> | undefined

export const useOnboarding = create<OnboardingState>((set) => ({
  userName: null,
  assistantName: null,
  brain: 'auto',
  wakeWord: true,
  mic: 'idle',
  setNames: (patch) => set(patch),
  setBrain: (brain) => set({ brain }),
  setWakeWord: (wakeWord) => set({ wakeWord }),
  startMicTest: () => {
    clearTimeout(micTimer)
    set({ mic: 'testing' })
    micTimer = setTimeout(() => set({ mic: 'ok' }), MIC_TEST_MS)
  },
  skipMic: () => {
    clearTimeout(micTimer)
    set({ mic: 'skipped' })
  },
}))

export const BRAINS: { id: BrainMode; title: string; tag: string; hint: string }[] = [
  {
    id: 'auto',
    title: 'Automático grátis',
    tag: 'Recomendado',
    hint: 'Uso IAs gratuitas na nuvem e troco sozinho se uma cair. Zero configuração.',
  },
  {
    id: 'choose',
    title: 'Eu escolho a IA',
    tag: 'Avançado',
    hint: 'Você escolhe o provedor (Claude, GPT, Gemini…) e cola sua chave.',
  },
  {
    id: 'local',
    title: 'No meu PC',
    tag: 'Privado',
    hint: 'Roda tudo offline com Ollama. Precisa de um PC mais forte.',
  },
]
