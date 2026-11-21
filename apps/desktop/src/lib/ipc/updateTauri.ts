import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { UPDATE_PROGRESS, type UpdateBackend, type UpdateProgress } from './updateTypes'

export const tauriUpdate: UpdateBackend = {
  appVersion: () => invoke('app_version'),
  updateCheck: () => invoke('update_check'),
  updateInstall: () => invoke('update_install'),
  onUpdateProgress: (cb) => listen<UpdateProgress>(UPDATE_PROGRESS, (e) => cb(e.payload)),
}
