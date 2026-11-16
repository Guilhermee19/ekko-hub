import { create } from 'zustand'
import { backend, type NowPlaying } from '@/lib/ipc'
import { DEVICES, TRACKS } from './mock'
import { positionAt, toTrack } from './nowPlaying'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  /** 0 for live streams / players that report no length. */
  durationSec: number
  /** CSS background value: the album art (`url(...)`) or a gradient stand-in. */
  cover: string
}

export interface Device {
  id: string
  name: string
  kind: 'desktop' | 'phone' | 'speaker'
}

export type Repeat = 'off' | 'all' | 'one'

interface MusicState {
  /** What the PC is playing (Windows media overlay); null when nothing is. */
  track: Track | null
  /** Friendly player name ("Spotify", "Chrome"...), null when nothing plays. */
  source: string | null
  playing: boolean
  positionSec: number
  toggle: () => void
  next: () => void
  prev: () => void
  /** Local only for now: GSMTC seek isn't exposed yet. */
  seek: (sec: number) => void

  // Spotify-only extras, still mock until the Spotify integration lands.
  /** 0..1 */
  volume: number
  queue: Track[]
  device: Device
  shuffle: boolean
  repeat: Repeat
  /** Spotify account linked (prototype switch). */
  connected: boolean
  setVolume: (v: number) => void
  setDevice: (id: string) => void
  playFromQueue: (id: string) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setConnected: (v: boolean) => void
}

const REPEAT_CYCLE: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' }

// Last backend snapshot and when it arrived: the local clock extrapolates from it, so
// Home, Música and the notch all show the same position between events.
let snapshot: NowPlaying | null = null
let receivedAt = 0
let ticker: ReturnType<typeof setInterval> | undefined

function apply(now: NowPlaying | null) {
  snapshot = now
  receivedAt = Date.now()
  useMusic.setState(
    now
      ? {
          track: toTrack(now),
          source: now.source,
          playing: now.playing,
          positionSec: positionAt(now, 0),
        }
      : { track: null, source: null, playing: false, positionSec: 0 },
  )
  syncClock(now?.playing ?? false)
}

function syncClock(playing: boolean) {
  if (playing && ticker === undefined) ticker = setInterval(tick, 1000)
  if (!playing && ticker !== undefined) {
    clearInterval(ticker)
    ticker = undefined
  }
}

function tick() {
  if (snapshot?.playing)
    useMusic.setState({ positionSec: positionAt(snapshot, Date.now() - receivedAt) })
}

/** Optimistic play/pause: flip now, the backend event confirms ~1 s later. */
function flipLocally() {
  if (!snapshot) return
  const positionMs = Math.round(positionAt(snapshot, Date.now() - receivedAt) * 1000)
  apply({ ...snapshot, playing: !snapshot.playing, positionMs })
}

const report = (err: unknown) => console.warn('[ekko] controle de mídia falhou', err)

export const useMusic = create<MusicState>((set, get) => ({
  track: null,
  source: null,
  playing: false,
  positionSec: 0,
  toggle: () => {
    flipLocally()
    backend.mediaPlayPause().catch(report)
  },
  next: () => {
    backend.mediaNext().catch(report)
  },
  prev: () => {
    backend.mediaPrevious().catch(report)
  },
  seek: (sec) => {
    const max = get().track?.durationSec || Infinity
    set({ positionSec: Math.min(max, Math.max(0, sec)) })
  },

  volume: 0.6,
  queue: TRACKS.slice(1),
  device: DEVICES[0],
  shuffle: false,
  repeat: 'off',
  connected: false,
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
  setDevice: (id) => set({ device: DEVICES.find((d) => d.id === id) ?? get().device }),
  playFromQueue: (id) => {
    const { queue } = get()
    const i = queue.findIndex((t) => t.id === id)
    if (i < 0) return
    set({ queue: queue.slice(i + 1) })
    backend.mediaNext().catch(report)
  },
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => set({ repeat: REPEAT_CYCLE[get().repeat] }),
  setConnected: (v) => set({ connected: v }),
}))

// Follow the backend from the first import; every window gets its own copy.
backend.onMediaChanged(apply).catch(report)
backend.mediaNow().then(apply, report)
