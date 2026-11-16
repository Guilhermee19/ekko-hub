import { invoke } from '@tauri-apps/api/core'
import type { ConnectorsBackend } from './connectors'

export const tauriConnectors: ConnectorsBackend = {
  haStatus: () => invoke('ha_status'),
  haSet: (url, token) => invoke('ha_set', { url, token }),
  haDisconnect: () => invoke('ha_disconnect'),
  haEntities: (domain) => invoke('ha_entities', { domain: domain ?? null }),
  haToggle: (entityId) => invoke('ha_toggle', { entityId }),
  claudeCodeStatus: () => invoke('claude_code_status'),
}
