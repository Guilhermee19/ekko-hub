import { create } from 'zustand'
import {
  backend,
  type CheckStatus,
  type HistoryPoint,
  type ProcessGroup,
  type ScanCheck,
  type ScanProgress,
  type SystemSnapshot,
  type Unlisten,
} from '@/lib/ipc'
import { appendPoint, toPoint } from './metrics'

// "Meu PC" state fed by the backend's system worker (events every ~1.5 s) and the
// "Verificar meu PC" scan, which reports progress per step.

export type StepStatus = 'pending' | 'running' | CheckStatus

export interface ScanStep {
  id: string
  label: string
  status: StepStatus
  check?: ScanCheck
}

type ScanState = 'idle' | 'running' | 'done'

interface MyPcState {
  snapshot: SystemSnapshot | null
  history: HistoryPoint[]
  processes: ProcessGroup[]
  scan: ScanState
  steps: ScanStep[]
  scanError: string | null
  /** Suggestions already applied in this scan (by check id). */
  applied: string[]
  startScan: () => void
  resetScan: () => void
  markApplied: (id: string) => void
}

/** Same order and labels as crates/ekko-os/src/system/scan.rs. */
const STEPS: [string, string][] = [
  ['memory', 'Memória'],
  ['cpu', 'Processador'],
  ['startup', 'Programas na inicialização'],
  ['temp', 'Arquivos temporários'],
  ['bin', 'Lixeira'],
  ['disk', 'Espaço em disco'],
]

const pendingSteps = (): ScanStep[] =>
  STEPS.map(([id, label]) => ({ id, label, status: 'pending' }))

const report = (err: unknown) => console.warn('[ekko] meu pc', err)

export const useMyPc = create<MyPcState>((set, get) => ({
  snapshot: null,
  history: [],
  processes: [],
  scan: 'idle',
  steps: pendingSteps(),
  scanError: null,
  applied: [],
  startScan: () => {
    if (get().scan === 'running') return
    set({ scan: 'running', steps: pendingSteps(), scanError: null, applied: [] })
    let unlisten: Unlisten | undefined
    const onProgress = (p: ScanProgress) =>
      set((s) => ({
        steps: s.steps.map((step) =>
          step.id !== p.id
            ? step
            : p.check
              ? { ...step, status: p.check.status, check: p.check }
              : { ...step, status: 'running' },
        ),
      }))
    backend
      .onScanProgress(onProgress)
      .then((u) => {
        unlisten = u
        return backend.systemScan()
      })
      .then((checks) => {
        // Events may be dropped; the final result is authoritative.
        set((s) => ({
          scan: 'done',
          steps: s.steps.map((step) => {
            const check = checks.find((c) => c.id === step.id)
            return check ? { ...step, status: check.status, check } : step
          }),
        }))
      })
      .catch((err: unknown) => {
        report(err)
        set({ scan: 'done', scanError: String(err) })
      })
      .finally(() => unlisten?.())
  },
  resetScan: () => {
    if (get().scan !== 'running') set({ scan: 'idle', steps: pendingSteps(), scanError: null })
  },
  markApplied: (id) => set((s) => ({ applied: [...s.applied, id] })),
}))

let subscribers = 0
let unlistens: Promise<Unlisten>[] = []

/** Starts following live telemetry; returns the matching stop (ref-counted). */
export function connectSystem(): () => void {
  if (subscribers++ === 0) {
    backend.systemSnapshot().then((snapshot) => {
      if (snapshot) useMyPc.setState({ snapshot })
    }, report)
    backend.systemHistory().then((history) => {
      useMyPc.setState((s) => ({
        history: history.length >= s.history.length ? history : s.history,
      }))
    }, report)
    backend.systemProcesses().then((processes) => useMyPc.setState({ processes }), report)
    unlistens = [
      backend.onSystemChanged((snapshot) =>
        useMyPc.setState((s) => ({ snapshot, history: appendPoint(s.history, toPoint(snapshot)) })),
      ),
      backend.onProcessesChanged((processes) => useMyPc.setState({ processes })),
    ]
  }
  return () => {
    if (--subscribers > 0) return
    for (const u of unlistens) u.then((stop) => stop(), report)
    unlistens = []
  }
}

/** 0..1 share of finished steps (a running step counts as half). */
export function scanProgress(steps: ScanStep[]): number {
  if (steps.length === 0) return 0
  const score = steps.reduce(
    (acc, s) => acc + (s.status === 'running' ? 0.5 : s.status === 'pending' ? 0 : 1),
    0,
  )
  return score / steps.length
}
