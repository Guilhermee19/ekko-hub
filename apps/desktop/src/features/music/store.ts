import { create } from 'zustand'
import { backend, type NowPlaying, type SpotifyAction, type SpotifyPlayback } from '@/lib/ipc'
import { useSpotify } from '@/features/spotify/store'
import { fromSpotify, isSpotify, positionAt, toTrack } from './nowPlaying'

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

interface MusicState {
  /** What is playing (Windows media overlay, else Spotify on another device). */
  track: Track | null
  /** Friendly player name ("Spotify", "Chrome"...), null when nothing plays. */
  source: string | null
  playing: boolean
  positionSec: number
  /** The progress bar may seek (Spotify API, or a Windows player that allows it). */
  canSeek: boolean
  /** Spotify is the player and is connected: controls go through its Web API. */
  viaSpotify: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
}

// `os` is the last Windows value; `snapshot` is what is shown (os, or Spotify remote)
// and when it arrived: the local clock extrapolates from it, so Home, Música and the
// notch all show the same position between events.
let os: NowPlaying | null = null
let snapshot: NowPlaying | null = null
let receivedAt = 0
let ticker: ReturnType<typeof setInterval> | undefined
let remote: { from: SpotifyPlayback | null; now: NowPlaying | null } = { from: null, now: null }

function remoteNow(): NowPlaying | null {
  const { connected, playback } = useSpotify.getState()
  if (!connected) return null
  if (remote.from !== playback) remote = { from: playback, now: playback && fromSpotify(playback) }
  return remote.now
}

function routing(now: NowPlaying | null) {
  const viaSpotify = useSpotify.getState().connected && isSpotify(now)
  const canSeek = (now?.durationMs ?? 0) > 0 && (viaSpotify || (now?.canSeek ?? false))
  return { viaSpotify, canSeek }
}

function apply(now: NowPlaying | null) {
  snapshot = now
  receivedAt = Date.now()
  useMusic.setState({
    ...routing(now),
    ...(now
      ? {
          track: toTrack(now),
          source: now.source,
          playing: now.playing,
          positionSec: positionAt(now, 0),
        }
      : { track: null, source: null, playing: false, positionSec: 0 }),
  })
  syncClock(now?.playing ?? false)
}

/** Shows Windows' player, else Spotify's; only re-applies when the choice changed. */
function show() {
  const next = os ?? remoteNow()
  if (next !== snapshot) apply(next)
  else useMusic.setState(routing(next))
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

/** Optimistic local change (play/pause, seek); the backend confirms shortly after. */
function patch(change: (now: NowPlaying, positionMs: number) => Partial<NowPlaying>) {
  if (!snapshot) return
  const positionMs = Math.round(positionAt(snapshot, Date.now() - receivedAt) * 1000)
  const next = { ...snapshot, positionMs, ...change(snapshot, positionMs) }
  if (snapshot === os) os = next
  else remote = { ...remote, now: next }
  apply(next)
}

const report = (err: unknown) => console.warn('[ekko] controle de mídia falhou', err)

/** Spotify API when it is the player; Windows otherwise (or when the API refuses). */
async function transport(action: SpotifyAction, windows: () => Promise<void>) {
  if (useMusic.getState().viaSpotify && (await useSpotify.getState().control(action))) return
  if (os) await windows().catch(report)
}

export const useMusic = create<MusicState>((_set, get) => ({
  track: null,
  source: null,
  playing: false,
  positionSec: 0,
  canSeek: false,
  viaSpotify: false,
  toggle: () => {
    const action = get().playing ? 'pause' : 'play'
    patch((now) => ({ playing: !now.playing }))
    void transport(action, () => backend.mediaPlayPause())
  },
  next: () => void transport('next', () => backend.mediaNext()),
  prev: () => void transport('previous', () => backend.mediaPrevious()),
  seek: (sec) => {
    const { canSeek, viaSpotify, track } = get()
    if (!canSeek || !track) return
    const ms = Math.round(Math.min(track.durationSec, Math.max(0, sec)) * 1000)
    patch(() => ({ positionMs: ms }))
    if (viaSpotify) void useSpotify.getState().seek(ms)
    else backend.mediaSeek(ms).catch(report)
  },
}))

function fromWindows(now: NowPlaying | null) {
  const trackChanged = now?.title !== os?.title || now?.artist !== os?.artist
  os = now
  show()
  // The Spotify queue moves with the track.
  if (trackChanged && useSpotify.getState().connected) useSpotify.getState().refreshSoon()
}

useSpotify.subscribe((s, prev) => {
  if (s.playback !== prev.playback || s.connected !== prev.connected) show()
})

// Follow the backend from the first import; every window gets its own copy.
backend.onMediaChanged(fromWindows).catch(report)
backend.mediaNow().then(fromWindows, report)
