import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'
import { DEVICES, TRACKS } from './mock'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  durationSec: number
  /** CSS gradient used as the cover background (stand-in for album art). */
  cover: string
}

export interface Device {
  id: string
  name: string
  kind: 'desktop' | 'phone' | 'speaker'
}

export type Repeat = 'off' | 'all' | 'one'

interface MusicState {
  track: Track
  playing: boolean
  positionSec: number
  /** 0..1 */
  volume: number
  queue: Track[]
  /** Tracks already played, most recent last (for "prev"). */
  history: Track[]
  device: Device
  shuffle: boolean
  repeat: Repeat
  /** Prototype switch: Spotify account linked or not. */
  connected: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
  setVolume: (v: number) => void
  setDevice: (id: string) => void
  playFromQueue: (id: string) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setConnected: (v: boolean) => void
}

const REPEAT_CYCLE: Record<Repeat, Repeat> = { off: 'all', all: 'one', one: 'off' }

// The clock lives in the store (not a component) so Home and the notch see the same
// position, and nothing calls setState inside a React effect.
let ticker: number | undefined

function syncClock(playing: boolean) {
  if (playing && ticker === undefined)
    ticker = globalThis.setInterval(tick, 1000) as unknown as number
  if (!playing && ticker !== undefined) {
    globalThis.clearInterval(ticker)
    ticker = undefined
  }
}

function tick() {
  const s = useMusic.getState()
  if (!s.playing) return
  if (s.positionSec + 1 < s.track.durationSec)
    return useMusic.setState({ positionSec: s.positionSec + 1 })
  if (s.repeat === 'one') return useMusic.setState({ positionSec: 0 })
  if (s.queue.length > 0 || s.repeat === 'all') return s.next()
  useMusic.setState({ playing: false, positionSec: s.track.durationSec })
  afterChange()
}

/** Mirrors the player into the notch pill and keeps the clock in step. */
function afterChange() {
  const { track, playing } = useMusic.getState()
  syncClock(playing)
  useAssistant.getState().set({
    activity: { kind: 'music', title: track.title, artist: track.artist, playing },
  })
}

export const useMusic = create<MusicState>((set, get) => ({
  track: TRACKS[0],
  playing: false,
  positionSec: 83,
  volume: 0.6,
  queue: TRACKS.slice(1),
  history: [],
  device: DEVICES[0],
  shuffle: false,
  repeat: 'off',
  connected: true,

  toggle: () => {
    const { playing, positionSec, track } = get()
    // Restart a finished track instead of "playing" at its end.
    set({ playing: !playing, positionSec: positionSec >= track.durationSec ? 0 : positionSec })
    afterChange()
  },
  next: () => {
    const { queue, track, history, shuffle, repeat } = get()
    let rest = repeat === 'all' ? [...queue, track] : queue
    if (rest.length === 0) {
      set({ positionSec: 0, playing: false })
      return afterChange()
    }
    const i = shuffle ? Math.floor(Math.random() * rest.length) : 0
    const nextTrack = rest[i]
    rest = rest.filter((_, k) => k !== i)
    set({ track: nextTrack, queue: rest, history: [...history, track], positionSec: 0 })
    afterChange()
  },
  prev: () => {
    const { positionSec, history, track, queue } = get()
    if (positionSec > 3 || history.length === 0) return set({ positionSec: 0 })
    const previous = history[history.length - 1]
    set({
      track: previous,
      history: history.slice(0, -1),
      queue: [track, ...queue],
      positionSec: 0,
    })
    afterChange()
  },
  seek: (sec) => set({ positionSec: Math.min(get().track.durationSec, Math.max(0, sec)) }),
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),
  setDevice: (id) => set({ device: DEVICES.find((d) => d.id === id) ?? get().device }),
  playFromQueue: (id) => {
    const { queue, track, history } = get()
    const i = queue.findIndex((t) => t.id === id)
    if (i < 0) return
    set({
      track: queue[i],
      queue: queue.slice(i + 1),
      history: [...history, track, ...queue.slice(0, i)],
      positionSec: 0,
      playing: true,
    })
    afterChange()
  },
  toggleShuffle: () => set({ shuffle: !get().shuffle }),
  cycleRepeat: () => set({ repeat: REPEAT_CYCLE[get().repeat] }),
  setConnected: (v) => {
    if (!v && get().playing) {
      set({ playing: false })
      afterChange()
    }
    set({ connected: v })
  },
}))
