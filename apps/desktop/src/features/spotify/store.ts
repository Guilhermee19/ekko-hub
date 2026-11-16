import { useEffect } from 'react'
import { create } from 'zustand'
import {
  backend,
  type SpotifyAction,
  type SpotifyDevice,
  type SpotifyPlayback,
  type SpotifyQueue,
  type SpotifyRepeat,
} from '@/lib/ipc'
import { errorText, useIntegrations } from '@/features/integrations/store'
import { coalesce } from '@/features/music/coalesce'

// Spotify Web API for the Música page: playback (shuffle, repeat, volume), devices
// (Spotify Connect) and the queue. "Now playing" stays in `useMusic`, which falls back
// to this playback when Windows sees nothing (music on the phone, a speaker...).

interface SpotifyState {
  connected: boolean
  account: string | null
  playback: SpotifyPlayback | null
  devices: SpotifyDevice[]
  queue: SpotifyQueue | null
  loading: boolean
  error: string | null
  /** Re-reads playback + devices + queue. */
  refresh: () => Promise<void>
  /** Debounced refresh after an action: Spotify applies changes asynchronously. */
  refreshSoon: () => void
  /** Moves playback to another Spotify Connect device and keeps playing. */
  transfer: (deviceId: string) => Promise<void>
  /** False when the call failed (e.g. Spotify Free), so callers can fall back. */
  control: (action: SpotifyAction) => Promise<boolean>
  setShuffle: (on: boolean) => Promise<void>
  setRepeat: (mode: SpotifyRepeat) => Promise<void>
  seek: (positionMs: number) => Promise<boolean>
  /** 0..100 on the active device; optimistic and coalesced (slider drags). */
  setVolume: (percent: number) => void
  /** Jumps to the `index`-th queued track by skipping ahead. */
  skipTo: (index: number) => Promise<void>
}

const SETTLE_MS = 600
const MAX_SKIP = 20
let soon: ReturnType<typeof setTimeout> | undefined

export const useSpotify = create<SpotifyState>((set, get) => {
  const guard = async (job: () => Promise<void>): Promise<boolean> => {
    if (!get().connected) return false
    try {
      await job()
      set({ error: null })
      return true
    } catch (err) {
      set({ error: errorText(err) })
      return false
    }
  }
  /** Runs `job`, then re-reads the player shortly after. */
  const act = async (job: () => Promise<void>) => {
    const ok = await guard(job)
    get().refreshSoon()
    return ok
  }
  const patchPlayback = (change: Partial<SpotifyPlayback>) =>
    set((s) => ({ playback: s.playback && { ...s.playback, ...change } }))
  const sendVolume = coalesce((percent: number) => act(() => backend.spotifyVolume(percent)))

  return {
    connected: false,
    account: null,
    playback: null,
    devices: [],
    queue: null,
    loading: false,
    error: null,
    refresh: async () => {
      set({ loading: true })
      await guard(async () => {
        const [playback, devices, queue] = await Promise.all([
          backend.spotifyState(),
          backend.spotifyDevices(),
          backend.spotifyQueue(),
        ])
        set({ playback, devices, queue })
      })
      set({ loading: false })
    },
    refreshSoon: () => {
      clearTimeout(soon)
      soon = setTimeout(() => void get().refresh(), SETTLE_MS)
    },
    transfer: async (deviceId) => {
      await act(() => backend.spotifyTransfer(deviceId))
      set((s) => ({ devices: s.devices.map((d) => ({ ...d, active: d.id === deviceId })) }))
    },
    control: (action) => act(() => backend.spotifyControl(action)),
    setShuffle: async (on) => {
      patchPlayback({ shuffle: on })
      await act(() => backend.spotifyShuffle(on))
    },
    setRepeat: async (mode) => {
      patchPlayback({ repeat: mode })
      await act(() => backend.spotifyRepeat(mode))
    },
    seek: (positionMs) => {
      patchPlayback({ progressMs: positionMs })
      return act(() => backend.spotifySeek(positionMs))
    },
    setVolume: (percent) => {
      const volume = Math.round(Math.min(100, Math.max(0, percent)))
      const withVolume = (d: SpotifyDevice) => (d.active ? { ...d, volume } : d)
      set((s) => ({
        devices: s.devices.map(withVolume),
        playback: s.playback && {
          ...s.playback,
          device: s.playback.device && { ...s.playback.device, volume },
        },
      }))
      sendVolume(volume)
    },
    skipTo: async (index) => {
      for (let i = 0; i <= Math.min(index, MAX_SKIP); i++) {
        if (!(await guard(() => backend.spotifyControl('next')))) break
      }
      get().refreshSoon()
    },
  }
})

/** Keeps the Spotify state fresh while a view (the Música page) is mounted. */
export function useSpotifyLive(intervalMs = 5000) {
  const connected = useSpotify((s) => s.connected)
  const refresh = useSpotify((s) => s.refresh)
  useEffect(() => {
    if (!connected) return
    void refresh()
    const id = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(id)
  }, [connected, refresh, intervalMs])
}

useIntegrations.subscribe((s) => {
  const { connected, account } = s.status.spotify
  const was = useSpotify.getState()
  if (connected === was.connected && account === was.account) return
  useSpotify.setState({
    connected,
    account,
    ...(connected ? {} : { playback: null, devices: [], queue: null, error: null }),
  })
  if (connected && !was.connected) void useSpotify.getState().refresh()
})
