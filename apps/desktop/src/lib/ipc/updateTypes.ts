import type { Unlisten } from './types'

// Mirrors commands/updates.rs.

export const UPDATE_PROGRESS = 'ekko://update/progress'

export interface UpdateInfo {
  current: string
  latest: string
  /** A newer version with an installer is out. */
  available: boolean
  /** Release notes (markdown from docs/releases). */
  notes: string
  pageUrl: string
  /** Installer size in bytes. */
  size: number | null
}

export interface UpdateProgress {
  done: number
  total: number
}

export interface UpdateBackend {
  /** The installed version (from tauri.conf.json). */
  appVersion(): Promise<string>
  /** Compares with the latest GitHub release. */
  updateCheck(): Promise<UpdateInfo>
  /** Downloads and verifies the installer, runs it and closes Ekko (it reopens updated). */
  updateInstall(): Promise<void>
  onUpdateProgress(cb: (p: UpdateProgress) => void): Promise<Unlisten>
}
