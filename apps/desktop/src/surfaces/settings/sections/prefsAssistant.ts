import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'
import { DEFAULT_SHORTCUTS, type ShortcutId } from './shortcutsCombo'

// Mock preferences for General, Avatar, Brain, Voice and Shortcuts (F1c). They move to the
// real `Settings` (Rust, persisted) as each phase lands: F2 Brain, F3 Voice, F8 Avatar.
// Avatar eyes and color already live in `Settings.appearance`.

export type BrainMode = 'auto' | 'pick' | 'local'
export type ProviderId = 'anthropic' | 'openai' | 'gemini' | 'groq'
export type Personality = 'fun' | 'cute' | 'pro' | 'sarcastic' | 'zen'
export type NotifySound = 'chime' | 'ping' | 'soft' | 'none'
export type TtsEngine = 'piper' | 'kokoro'

export interface AssistantPrefs {
  general: {
    autostart: boolean
    hideFullscreen: boolean
    dnd: { enabled: boolean; from: string; to: string }
    sound: NotifySound
  }
  avatar: {
    expression: string
    accessories: string[]
    name: string
    behaviors: { walk: boolean; flies: boolean; sleep: boolean }
  }
  brain: {
    mode: BrainMode
    provider: ProviderId
    /** Mock only: in F2 keys live in the Windows Credential Manager, never here. */
    keys: Record<ProviderId, string>
    models: Record<ProviderId, string>
    personality: Personality
    ollamaFound: boolean
    localModel: string
  }
  voice: {
    mic: string
    conversation: boolean
    wakeWord: boolean
    sensitivity: number
    wakeSamples: boolean[]
    stt: 'whisper-small' | 'whisper-medium'
    tts: TtsEngine
    ttsVoice: string
    speed: number
  }
  shortcuts: Record<ShortcutId, string>
  /** Mock model downloads; progress is derived from elapsed time (see downloadProgress). */
  downloads: Record<string, Download>
}

export interface Download {
  startedAt: number
  ms: number
  done: boolean
}

export const DEFAULT_PREFS: AssistantPrefs = {
  general: {
    autostart: true,
    hideFullscreen: true,
    dnd: { enabled: false, from: '22:00', to: '07:00' },
    sound: 'chime',
  },
  avatar: {
    expression: 'happy',
    accessories: [],
    name: 'Ekko',
    behaviors: { walk: false, flies: true, sleep: true },
  },
  brain: {
    mode: 'auto',
    provider: 'anthropic',
    keys: { anthropic: '', openai: '', gemini: '', groq: '' },
    models: {
      anthropic: 'claude-sonnet-5-5',
      openai: 'gpt-5.1-mini',
      gemini: 'gemini-3-flash',
      groq: 'llama-4-scout',
    },
    personality: 'fun',
    ollamaFound: false,
    localModel: 'qwen3:8b',
  },
  voice: {
    mic: 'default',
    conversation: false,
    wakeWord: true,
    sensitivity: 0.5,
    wakeSamples: [false, false, false, false],
    stt: 'whisper-small',
    tts: 'piper',
    ttsVoice: 'faber',
    speed: 1,
  },
  shortcuts: DEFAULT_SHORTCUTS,
  downloads: {},
}

type Section = Exclude<keyof AssistantPrefs, 'shortcuts' | 'downloads'>

interface PrefsState extends AssistantPrefs {
  patch: <K extends Section>(section: K, value: Partial<AssistantPrefs[K]>) => void
  setShortcut: (id: ShortcutId, combo: string) => void
  /** Starts a fake download that completes after `ms`. */
  startDownload: (id: string, ms: number) => void
  reset: () => void
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...DEFAULT_PREFS,
  patch: (section, value) => set((s) => ({ [section]: { ...s[section], ...value } })),
  setShortcut: (id, combo) => set((s) => ({ shortcuts: { ...s.shortcuts, [id]: combo } })),
  startDownload: (id, ms) => {
    const startedAt = Date.now()
    set((s) => ({ downloads: { ...s.downloads, [id]: { startedAt, ms, done: false } } }))
    window.setTimeout(() => {
      const d = get().downloads[id]
      // Ignore if reset or restarted meanwhile.
      if (d?.startedAt === startedAt)
        set((s) => ({ downloads: { ...s.downloads, [id]: { ...d, done: true } } }))
    }, ms)
  },
  reset: () => set(DEFAULT_PREFS),
}))

/** Progress 0..1 of a mock download; null when it was never started. */
export function downloadProgress(d: Download | undefined, now: number): number | null {
  if (!d) return null
  if (d.done) return 1
  return Math.min(1, Math.max(0, (now - d.startedAt) / d.ms))
}

/** True while any download is still running (drives the progress clock). */
export const anyDownloading = (downloads: Record<string, Download>) =>
  Object.values(downloads).some((d) => !d.done)

/** Shows a short toast in every surface (auto-clears). */
export const toast = (text: string) => useAssistant.getState().set({ toast: text })
