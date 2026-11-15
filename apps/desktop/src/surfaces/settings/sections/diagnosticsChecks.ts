import {
  Brain,
  Download,
  HardDrive,
  Mic,
  ScreenShare,
  Speaker,
  Webcam,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

export type CheckStatus = 'pending' | 'running' | 'ok' | 'warn' | 'error'

export interface CheckDef {
  id: string
  label: string
  icon: LucideIcon
  /** Mock outcome for F1c; F9 runs the real probe. */
  outcome: Exclude<CheckStatus, 'pending' | 'running'>
  detail: string
  /** How long the mock probe "takes". */
  ms: number
}

export const CHECKS: CheckDef[] = [
  {
    id: 'mic',
    label: 'Microfone',
    icon: Mic,
    outcome: 'ok',
    detail: 'Microfone (Realtek) · nível bom',
    ms: 700,
  },
  {
    id: 'tts',
    label: 'Saída de voz',
    icon: Speaker,
    outcome: 'ok',
    detail: 'Alto-falantes · Piper respondeu em 180 ms',
    ms: 600,
  },
  {
    id: 'webcam',
    label: 'Webcam',
    icon: Webcam,
    outcome: 'warn',
    detail: 'Nenhuma webcam encontrada',
    ms: 500,
  },
  {
    id: 'screen',
    label: 'Captura de tela',
    icon: ScreenShare,
    outcome: 'ok',
    detail: '2 monitores · 1920×1080',
    ms: 400,
  },
  {
    id: 'ai',
    label: 'IA (latência)',
    icon: Brain,
    outcome: 'ok',
    detail: 'Groq · 420 ms até o primeiro token',
    ms: 1100,
  },
  { id: 'net', label: 'Internet', icon: Wifi, outcome: 'ok', detail: 'Online · 23 ms', ms: 500 },
  {
    id: 'models',
    label: 'Modelos de voz baixados',
    icon: Download,
    outcome: 'error',
    detail: 'Wake word "Ei, Ekko" não baixado',
    ms: 600,
  },
  {
    id: 'disk',
    label: 'Espaço em disco',
    icon: HardDrive,
    outcome: 'ok',
    detail: '214 GB livres em C:',
    ms: 400,
  },
]

/** Lines cycled by the live log tail. */
export const LOG_LINES = [
  'INFO  ekko_core::presence  phase=idle',
  'DEBUG ekko_voice::vad      silence 1.2s, closing utterance',
  'INFO  ekko_ai::router      provider=groq model=llama-3.3-70b',
  'INFO  ekko_tools::audit    tool=timer risk=safe result=ok',
  'DEBUG ekko_hub::display    notch offset=0.50 monitor=0',
  'WARN  ekko_voice::models   wake word model missing',
  'INFO  ekko_tools::audit    tool=volume risk=safe result=ok',
  'DEBUG ekko_store::sqlite   checkpoint ok (12 pages)',
  'INFO  ekko_core::presence  phase=listening',
  'INFO  ekko_core::presence  phase=thinking',
  'INFO  ekko_core::presence  phase=speaking',
  'DEBUG ekko_hub::ipc        broadcast ekko://assistant/presence',
]

export const LOG_TICK_MS = 1500

/** Last `n` mock log lines at a given clock time; pure so the tail is just derived from `now`. */
export function logTail(now: number, n = 12): { key: number; time: number; text: string }[] {
  const tick = Math.floor(now / LOG_TICK_MS)
  return Array.from({ length: n }, (_, i) => {
    const k = tick - n + 1 + i
    return {
      key: k,
      time: k * LOG_TICK_MS,
      text: LOG_LINES[((k % LOG_LINES.length) + LOG_LINES.length) % LOG_LINES.length],
    }
  })
}
