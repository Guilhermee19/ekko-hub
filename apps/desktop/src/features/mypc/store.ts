import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'

// Feature-local mock for "Meu PC". F2/F6 replace it with backend telemetry and risk-rated Tools.

export interface HeavyApp {
  id: string
  name: string
  /** Resident memory in MB. */
  memMb: number
  cpu: number
}

export type StepStatus = 'pending' | 'running' | 'ok' | 'warn'

export interface ScanStep {
  id: string
  label: string
  status: StepStatus
  finding?: string
}

export interface Fix {
  id: string
  label: string
  done: boolean
}

type ScanStatus = 'idle' | 'running' | 'done'

interface MyPcState {
  apps: HeavyApp[]
  /** App waiting for the "Fechar?" confirmation. */
  confirmId: string | null
  scan: ScanStatus
  steps: ScanStep[]
  fixes: Fix[]
  askClose: (id: string | null) => void
  closeApp: (id: string) => void
  startScan: () => void
  resetScan: () => void
  applyFix: (id: string) => void
}

const APPS: HeavyApp[] = [
  { id: 'chrome', name: 'Google Chrome', memMb: 2150, cpu: 12 },
  { id: 'code', name: 'Visual Studio Code', memMb: 1240, cpu: 6 },
  { id: 'discord', name: 'Discord', memMb: 610, cpu: 2 },
  { id: 'spotify', name: 'Spotify', memMb: 420, cpu: 1 },
  { id: 'teams', name: 'Microsoft Teams', memMb: 380, cpu: 3 },
]

/** Scripted outcome of each check (mock). */
const SCRIPT: { id: string; label: string; status: 'ok' | 'warn'; finding: string }[] = [
  { id: 'mem', label: 'Memória', status: 'ok', finding: '68% em uso, tudo certo' },
  { id: 'cpu', label: 'Processador', status: 'ok', finding: 'Uso médio de 34%' },
  {
    id: 'startup',
    label: 'Programas na inicialização',
    status: 'warn',
    finding: '3 programas atrasam o início',
  },
  { id: 'temp', label: 'Arquivos temporários', status: 'warn', finding: '1,8 GB de temporários' },
  { id: 'disk', label: 'Disco', status: 'ok', finding: '142 GB livres em C:' },
  { id: 'bin', label: 'Lixeira', status: 'warn', finding: '640 MB na lixeira' },
]

const FIXES: Fix[] = [
  { id: 'temp', label: 'Limpar 1,8 GB', done: false },
  { id: 'startup', label: 'Desativar 3 programas na inicialização', done: false },
  { id: 'bin', label: 'Esvaziar lixeira (640 MB)', done: false },
]

const FIX_TOASTS: Record<string, string> = {
  temp: '1,8 GB de temporários limpos',
  startup: '3 programas não abrem mais com o Windows',
  bin: 'Lixeira esvaziada',
}

const STEP_MS = 850

const pendingSteps = (): ScanStep[] =>
  SCRIPT.map(({ id, label }) => ({ id, label, status: 'pending' }))

const toast = (text: string) => useAssistant.getState().set({ toast: text })

let timer: number | undefined

export const useMyPc = create<MyPcState>((set, get) => ({
  apps: APPS,
  confirmId: null,
  scan: 'idle',
  steps: pendingSteps(),
  fixes: FIXES,
  askClose: (id) => set({ confirmId: id }),
  closeApp: (id) => {
    const app = get().apps.find((a) => a.id === id)
    set((s) => ({ apps: s.apps.filter((a) => a.id !== id), confirmId: null }))
    if (app) toast(`${app.name} fechado`)
  },
  startScan: () => {
    window.clearTimeout(timer)
    set({ scan: 'running', steps: pendingSteps(), fixes: FIXES.map((f) => ({ ...f })) })
    // Each tick finishes the running step and starts the next one.
    const tick = (index: number) => {
      set((s) => ({
        steps: s.steps.map((step, i) => {
          if (i === index - 1)
            return { ...step, status: SCRIPT[i].status, finding: SCRIPT[i].finding }
          if (i === index) return { ...step, status: 'running' }
          return step
        }),
      }))
      if (index < SCRIPT.length) timer = window.setTimeout(() => tick(index + 1), STEP_MS)
      else set({ scan: 'done' })
    }
    tick(0)
  },
  resetScan: () => {
    window.clearTimeout(timer)
    set({ scan: 'idle', steps: pendingSteps() })
  },
  applyFix: (id) => {
    set((s) => ({ fixes: s.fixes.map((f) => (f.id === id ? { ...f, done: true } : f)) }))
    toast(FIX_TOASTS[id] ?? 'Pronto')
  },
}))

/** 0..1 share of finished steps (a running step counts as half). */
export function scanProgress(steps: ScanStep[]): number {
  if (steps.length === 0) return 0
  const score = steps.reduce(
    (acc, s) => acc + (s.status === 'running' ? 0.5 : s.status === 'pending' ? 0 : 1),
    0,
  )
  return score / steps.length
}

/** "2,1 GB" / "610 MB" in pt-BR. */
export function formatMem(mb: number): string {
  if (mb >= 1000) return `${(mb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
  return `${Math.round(mb)} MB`
}
