import { create } from 'zustand'
import { backend, type IntegrationProvider, type IntegrationStatus } from '@/lib/ipc'

// Connection status for Spotify / Google / Gmail / Outlook, shared by Settings, Agenda,
// Música and E-mail.
// Tokens never reach the UI: only "connected" and the account name.

const OFF = { connected: false, account: null, clientId: null, hasSecret: false, builtIn: false }
const EMPTY: IntegrationStatus = { spotify: OFF, google: OFF, gmail: OFF, outlook: OFF }

const CONNECT: Record<IntegrationProvider, () => Promise<IntegrationStatus>> = {
  spotify: () => backend.connectSpotify(),
  google: () => backend.connectGoogle(),
  gmail: () => backend.connectGmail(),
  outlook: () => backend.connectOutlook(),
}

interface IntegrationsState {
  status: IntegrationStatus
  /** Provider waiting for the browser login. */
  connecting: IntegrationProvider | null
  /** Last error per provider (pt-BR, straight from the backend). */
  error: Partial<Record<IntegrationProvider, string>>
  refresh: () => Promise<void>
  setClient: (p: IntegrationProvider, clientId: string, clientSecret?: string) => Promise<void>
  connect: (p: IntegrationProvider) => Promise<boolean>
  disconnect: (p: IntegrationProvider) => Promise<void>
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err))

export const useIntegrations = create<IntegrationsState>((set, get) => {
  const fail = (p: IntegrationProvider, err: unknown) =>
    set((s) => ({ error: { ...s.error, [p]: errorText(err) } }))
  const ok = (p: IntegrationProvider, status: IntegrationStatus) =>
    set((s) => ({ status, error: { ...s.error, [p]: undefined } }))

  return {
    status: EMPTY,
    connecting: null,
    error: {},
    refresh: async () => {
      try {
        set({ status: await backend.integrationStatus() })
      } catch (err) {
        console.error('[ekko] integrações:', errorText(err))
      }
    },
    setClient: async (p, clientId, clientSecret) => {
      try {
        ok(p, await backend.setIntegrationClient(p, clientId, clientSecret))
      } catch (err) {
        fail(p, err)
      }
    },
    connect: async (p) => {
      if (get().connecting) return false
      set((s) => ({ connecting: p, error: { ...s.error, [p]: undefined } }))
      try {
        ok(p, await CONNECT[p]())
        return true
      } catch (err) {
        fail(p, err)
        return false
      } finally {
        set({ connecting: null })
      }
    },
    disconnect: async (p) => {
      try {
        ok(p, await backend.disconnectIntegration(p))
      } catch (err) {
        fail(p, err)
      }
    },
  }
})

void useIntegrations.getState().refresh()
