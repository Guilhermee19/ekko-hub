import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  PROCESSES_CHANGED,
  SCAN_PROGRESS,
  SYSTEM_CHANGED,
  type ProcessGroup,
  type ScanProgress,
  type SystemBackend,
  type SystemSnapshot,
} from './systemTypes'

export const tauriSystem: SystemBackend = {
  systemSnapshot: () => invoke('system_snapshot'),
  systemHistory: () => invoke('system_history'),
  systemProcesses: (sortBy) => invoke('system_processes', { sortBy: sortBy ?? null }),
  onSystemChanged: (cb) => listen<SystemSnapshot>(SYSTEM_CHANGED, (e) => cb(e.payload)),
  onProcessesChanged: (cb) => listen<ProcessGroup[]>(PROCESSES_CHANGED, (e) => cb(e.payload)),
  onScanProgress: (cb) => listen<ScanProgress>(SCAN_PROGRESS, (e) => cb(e.payload)),
  systemKill: ({ name, pid }) => invoke('system_kill', { name: name ?? null, pid: pid ?? null }),
  systemScan: () => invoke('system_scan'),
  systemCleanTemp: () => invoke('system_clean_temp'),
  systemEmptyRecycleBin: () => invoke('system_empty_recycle_bin'),
  systemOpenStartupSettings: () => invoke('system_open_startup_settings'),
  auditRecent: (limit) => invoke('audit_recent', { limit: limit ?? null }),
}
