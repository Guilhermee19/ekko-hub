import type { Unlisten } from './types'

// Mirrors crates/ekko-os/src/system (snapshot, groups, kill, scan, cleanup),
// crates/ekko-core/src/audit.rs and commands/system.rs.

export const SYSTEM_CHANGED = 'ekko://system/changed'
export const PROCESSES_CHANGED = 'ekko://system/processes'
export const SCAN_PROGRESS = 'ekko://system/scan'

export interface CpuStat {
  /** 0..100 */
  total: number
  cores: number[]
  brand: string
}

export interface MemoryStat {
  used: number
  total: number
  swapUsed: number
  swapTotal: number
}

export interface DiskStat {
  /** "C:\" */
  mount: string
  label: string
  total: number
  available: number
  removable: boolean
}

export interface GpuStat {
  usage: number
  name: string | null
  vramUsed: number | null
  vramTotal: number | null
  /** °C of the hottest GPU with a sensor (usually the dedicated one); null when none. */
  temperature: number | null
}

export interface SystemSnapshot {
  atMs: number
  cpu: CpuStat
  memory: MemoryStat
  uptimeSecs: number
  disks: DiskStat[]
  network: { rxPerSec: number; txPerSec: number }
  /** null: no GPU counters on this PC. */
  gpu: GpuStat | null
  /** °C; null on most Windows PCs. */
  temperature: number | null
  processCount: number
}

export interface HistoryPoint {
  atMs: number
  cpu: number
  ram: number
  gpu: number | null
  disk: number | null
  /** rx + tx bytes/s */
  net: number
  temp: number | null
}

export type Protection = 'protected' | 'warn' | 'ok'
export type SortBy = 'memory' | 'cpu' | 'name'

export interface ProcEntry {
  pid: number
  /** % of the whole machine */
  cpu: number
  memory: number
}

export interface ProcessGroup {
  /** Executable name, the group key ("chrome.exe"). */
  name: string
  /** Friendly name ("Google Chrome"). */
  label: string
  path: string | null
  count: number
  cpu: number
  memory: number
  protection: Protection
  processes: ProcEntry[]
}

export type KillOutcome = 'closed' | 'terminated' | 'gone' | 'failed'

export interface KillReport {
  name: string
  results: { pid: number; outcome: KillOutcome; error: string | null }[]
  ended: number
  failed: number
}

export type CheckStatus = 'ok' | 'warn' | 'info'

export type ScanAction =
  | { kind: 'cleanTemp'; bytes: number }
  | { kind: 'emptyRecycleBin'; bytes: number }
  | { kind: 'openStartup' }

export interface CheckItem {
  label: string
  detail: string
  warn: boolean
}

export interface ScanCheck {
  id: string
  label: string
  status: CheckStatus
  finding: string
  value: number | null
  bytes: number | null
  items: CheckItem[]
  action: ScanAction | null
}

/** One per step: `check` null while it runs, filled when it is done. */
export interface ScanProgress {
  index: number
  total: number
  id: string
  label: string
  check: ScanCheck | null
}

export interface CleanReport {
  freedBytes: number
  deletedFiles: number
  skippedFiles: number
}

export interface AuditLogEntry {
  atMs: number
  tool: string
  detail: string
  risk: 'safe' | 'confirm' | 'dangerous'
  result: 'ok' | 'denied' | 'error'
  origin: string
}

export interface SystemBackend {
  /** Latest telemetry (null until the first sample). */
  systemSnapshot(): Promise<SystemSnapshot | null>
  /** Oldest first, up to 60 samples (~90 s). */
  systemHistory(): Promise<HistoryPoint[]>
  systemProcesses(sortBy?: SortBy): Promise<ProcessGroup[]>
  onSystemChanged(cb: (s: SystemSnapshot) => void): Promise<Unlisten>
  onProcessesChanged(cb: (groups: ProcessGroup[]) => void): Promise<Unlisten>
  onScanProgress(cb: (p: ScanProgress) => void): Promise<Unlisten>
  /** Ends a whole group (`name`) or one `pid`; protected processes are refused. */
  systemKill(target: { name?: string; pid?: number }): Promise<KillReport>
  systemScan(): Promise<ScanCheck[]>
  /** Only files older than 24 h in the user's %TEMP%. */
  systemCleanTemp(): Promise<CleanReport>
  /** Bytes freed. */
  systemEmptyRecycleBin(): Promise<number>
  systemOpenStartupSettings(): Promise<void>
  /** Newest first. */
  auditRecent(limit?: number): Promise<AuditLogEntry[]>
}
