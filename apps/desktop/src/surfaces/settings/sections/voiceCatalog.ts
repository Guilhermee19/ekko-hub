import type { TtsEngine } from './prefsAssistant'

// Mock catalog for the Voice page. F3 lists real devices (cpal) and downloads real models.

export const MICS = [
  { id: 'default', label: 'Padrão do Windows (Microfone Realtek)' },
  { id: 'headset', label: 'Headset HyperX Cloud II' },
  { id: 'webcam', label: 'Microfone da webcam (C920)' },
  { id: 'usb', label: 'Fifine K669 (USB)' },
]

export const STT_MODELS = [
  { id: 'whisper-small', label: 'Whisper small', hint: 'Rápido, ótimo para comandos' },
  { id: 'whisper-medium', label: 'Whisper medium', hint: 'Mais preciso, pede mais CPU' },
] as const

export interface TtsVoice {
  id: string
  name: string
  hint: string
}

export const TTS_ENGINES: { id: TtsEngine; title: string; hint: string; voices: TtsVoice[] }[] = [
  {
    id: 'piper',
    title: 'Piper',
    hint: 'Rápido: responde na hora, até em PC simples.',
    voices: [
      { id: 'faber', name: 'Faber', hint: 'Masculina, neutra' },
      { id: 'edresson', name: 'Edresson', hint: 'Masculina, grave' },
      { id: 'cadu', name: 'Cadu', hint: 'Masculina, jovem' },
    ],
  },
  {
    id: 'kokoro',
    title: 'Kokoro',
    hint: 'Qualidade: mais natural, leva um instante a mais.',
    voices: [
      { id: 'dora', name: 'Dora', hint: 'Feminina, calma' },
      { id: 'alex', name: 'Alex', hint: 'Masculina, expressiva' },
    ],
  },
]

export const VOICE_MODELS = [
  { id: 'voice:whisper-small', label: 'Whisper small (fala → texto)', sizeMb: 466 },
  { id: 'voice:whisper-medium', label: 'Whisper medium (fala → texto)', sizeMb: 1530 },
  { id: 'voice:piper-ptbr', label: 'Vozes Piper pt-BR', sizeMb: 63 },
  { id: 'voice:kokoro', label: 'Kokoro (voz de qualidade)', sizeMb: 330 },
  { id: 'voice:wakeword', label: 'Palavra de ativação "Ei, Ekko"', sizeMb: 4 },
]

export const WAKE_SAMPLES = 4

/**
 * Fake microphone level 0..1 for time `t` (ms): syllable-like bursts over a slow swell,
 * deterministic so it can be rendered from a clock without side effects.
 */
export function mockMicLevel(t: number): number {
  const syllables = Math.abs(Math.sin(t / 140))
  const phrase = 0.5 + 0.5 * Math.sin(t / 1300)
  const jitter = 0.08 * Math.sin(t * 0.37)
  return Math.min(1, Math.max(0, 0.06 + syllables * phrase * 0.85 + jitter))
}

/** Number of lit bars in a `bars`-segment meter for a level 0..1. */
export const litBars = (level: number, bars: number) =>
  Math.round(Math.min(1, Math.max(0, level)) * bars)
