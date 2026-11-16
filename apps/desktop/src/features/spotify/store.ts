import { create } from 'zustand'
import { backend, type SpotifyAction, type SpotifyDevice, type SpotifyQueue } from '@/lib/ipc'
import { errorText, useIntegrations } from '@/features/integrations/store'

// Spotify Web API extras for the Música page: devices (Spotify Connect) and the queue.
// "Now playing" stays in `useMusic` (Windows media session); this only adds what the
// OS can't see.

interface SpotifyState {
  connected: boolean
  account: string | null
  devices: SpotifyDevice[]
  queue: SpotifyQueue | null
  loading: boolean
  error: string | null
  /** Re-reads devices + queue (call when the Música page opens). */
  refresh: () => Promise<void>
  /** Moves playback to another Spotify Connect device and keeps playing. */
  transfer: (deviceId: string) => Promise<void>
  control: (action: SpotifyAction) => Promise<void>
}

export const useSpotify = create<SpotifyState>((set, get) => {
  const guard = async (job: () => Promise<void>) => {
    if (!get().connected) return
    try {
      await job()
      set({ error: null })
    } catch (err) {
      set({ error: errorText(err) })
    }
  }

  return {
    connected: false,
    account: null,
    devices: [],
    queue: null,
    loading: false,
    error: null,
    refresh: async () => {
      set({ loading: true })
      await guard(async () => {
        const [devices, queue] = await Promise.all([
          backend.spotifyDevices(),
          backend.spotifyQueue(),
        ])
        set({ devices, queue })
      })
      set({ loading: false })
    },
    transfer: (deviceId) =>
      guard(async () => {
        await backend.spotifyTransfer(deviceId)
        // Optimistic: Spotify takes a moment to report the new active device.
        set((s) => ({ devices: s.devices.map((d) => ({ ...d, active: d.id === deviceId })) }))
      }),
    control: (action) => guard(() => backend.spotifyControl(action)),
  }
})

useIntegrations.subscribe((s) => {
  const { connected, account } = s.status.spotify
  const was = useSpotify.getState()
  if (connected === was.connected && account === was.account) return
  useSpotify.setState({
    connected,
    account,
    ...(connected ? {} : { devices: [], queue: null }),
  })
  if (connected && !was.connected) void useSpotify.getState().refresh()
})
