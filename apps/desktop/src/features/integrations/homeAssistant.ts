import { create } from 'zustand'
import { backend, type HaEntity, type HomeAssistantStatus } from '@/lib/ipc'
import { errorText } from './store'

// Home Assistant link + the toggleable entities shown in Settings. The token stays in Rust.

/** Domains the card lists with an on/off switch. */
export const TOGGLE_DOMAINS = ['light', 'switch', 'fan'] as const

const EMPTY: HomeAssistantStatus = {
  url: null,
  hasToken: false,
  connected: false,
  version: null,
  locationName: null,
  error: null,
}

interface HomeAssistantState {
  status: HomeAssistantStatus
  entities: HaEntity[]
  /** Saving / testing the connection. */
  busy: boolean
  /** Entity ids waiting for a toggle reply. */
  pending: string[]
  error: string | null
  refresh: () => Promise<void>
  save: (url: string, token: string) => Promise<boolean>
  disconnect: () => Promise<void>
  loadEntities: () => Promise<void>
  toggle: (entityId: string) => Promise<void>
}

const toggleable = (list: HaEntity[]) =>
  list.filter((e) => (TOGGLE_DOMAINS as readonly string[]).includes(e.domain))

export const useHomeAssistant = create<HomeAssistantState>((set, get) => {
  const apply = async (call: Promise<HomeAssistantStatus>) => {
    set({ busy: true, error: null })
    try {
      const status = await call
      set({ status, error: status.error })
      if (status.connected) void get().loadEntities()
      else set({ entities: [] })
      return status.connected
    } catch (err) {
      set({ error: errorText(err) })
      return false
    } finally {
      set({ busy: false })
    }
  }

  return {
    status: EMPTY,
    entities: [],
    busy: false,
    pending: [],
    error: null,
    refresh: async () => {
      await apply(backend.haStatus())
    },
    save: (url, token) => apply(backend.haSet(url, token)),
    disconnect: async () => {
      await apply(backend.haDisconnect())
    },
    loadEntities: async () => {
      try {
        set({ entities: toggleable(await backend.haEntities()) })
      } catch (err) {
        set({ error: errorText(err) })
      }
    },
    toggle: async (entityId) => {
      if (get().pending.includes(entityId)) return
      set((s) => ({ pending: [...s.pending, entityId] }))
      try {
        const changed = await backend.haToggle(entityId)
        if (changed.length === 0) await get().loadEntities()
        else {
          const byId = new Map(changed.map((e) => [e.entityId, e]))
          set((s) => ({ entities: s.entities.map((e) => byId.get(e.entityId) ?? e) }))
        }
      } catch (err) {
        set({ error: errorText(err) })
      } finally {
        set((s) => ({ pending: s.pending.filter((id) => id !== entityId) }))
      }
    },
  }
})
