import { create } from 'zustand'
import { backend, type VolumeState } from '@/lib/ipc'
import { useSpotify } from '@/features/spotify/store'
import { alertMs, flashActivity } from '@/features/hud/flash'
import { useSettings } from '@/stores/settings'
import { coalesce } from './coalesce'
import { volumeTarget, type Player, type VolumeTarget } from './nowPlaying'
import { useMusic } from './store'

// One volume slider, two targets: Spotify's device volume when Spotify is the player
// (and connected), otherwise the Windows master volume, which works with no login.
// Changes made through Ekko flash the notch's volume pill.

const useWindowsVolume = create<VolumeState>(() => ({ level: 0, muted: false }))

const report = (err: unknown) => console.warn('[ekko] volume falhou', err)
const sendWindows = coalesce((level: number) => backend.volumeSet(level).then(adopt))

function adopt(state: VolumeState) {
  useWindowsVolume.setState(state)
}

/** Our own last change: the OS echo of it must not flash again. */
let ownChangeAt = 0
let known = false
/** Only the window with the pill (notch/dock) reacts, or every window would flash. */
let reactToOs = false

export function reactToOsVolume() {
  reactToOs = true
}

/** Volume changed outside Ekko (keyboard keys, Windows flyout): flash the pill. */
function fromOs(state: VolumeState) {
  const before = useWindowsVolume.getState()
  adopt(state)
  const moved = before.muted !== state.muted || Math.abs(before.level - state.level) >= 0.005
  const ours = Date.now() - ownChangeAt < 800
  const on = useSettings.getState().settings.appearance.pillShow.system
  if (reactToOs && known && moved && !ours && on) flashVolume(state.muted ? 0 : state.level)
  known = true
}

backend.onVolumeChanged(fromOs).catch(report)
backend.volumeGet().then((s) => {
  adopt(s)
  known = true
}, report)

function player(track: unknown, viaSpotify: boolean): Player {
  return track === null ? 'none' : viaSpotify ? 'spotify' : 'other'
}

function currentTarget(): VolumeTarget {
  const spotify = useSpotify.getState()
  const { track, viaSpotify } = useMusic.getState()
  const volume = spotify.playback?.device?.volume ?? null
  return volumeTarget(spotify.connected, player(track, viaSpotify), volume)
}

/** Transient notch pill; clears itself unless another change replaced it. */
export function flashVolume(level: number) {
  flashActivity({ kind: 'volume', level }, alertMs())
}

/** Sets the volume (0..1) on the current target. */
export function setVolume(level: number) {
  ownChangeAt = Date.now()
  const v = Math.min(1, Math.max(0, level))
  flashVolume(v)
  if (currentTarget() === 'spotify') {
    useSpotify.getState().setVolume(v * 100)
    return
  }
  useWindowsVolume.setState((s) => ({ level: v, muted: v > 0 ? false : s.muted }))
  sendWindows(v)
}

let beforeMute = 0.5

/** Windows: real mute. Spotify (no mute in its API): volume 0 and back. */
export function toggleMute() {
  ownChangeAt = Date.now()
  if (currentTarget() === 'spotify') {
    const percent = useSpotify.getState().playback?.device?.volume ?? 0
    if (percent > 0) beforeMute = percent / 100
    setVolume(percent > 0 ? 0 : beforeMute)
    return
  }
  const { level, muted } = useWindowsVolume.getState()
  flashVolume(muted ? level : 0)
  useWindowsVolume.setState({ muted: !muted })
  backend.volumeMute(!muted).then(adopt, report)
}

export interface VolumeView {
  target: VolumeTarget
  /** 0..1 */
  level: number
  muted: boolean
}

/** What the slider shows, following whichever target is active. */
export function useVolume(): VolumeView {
  const windows = useWindowsVolume()
  const connected = useSpotify((s) => s.connected)
  const spotifyVolume = useSpotify((s) => s.playback?.device?.volume ?? null)
  const playing = useMusic((s) => player(s.track, s.viaSpotify))
  if (volumeTarget(connected, playing, spotifyVolume) === 'spotify' && spotifyVolume !== null)
    return { target: 'spotify', level: spotifyVolume / 100, muted: spotifyVolume === 0 }
  return { target: 'windows', ...windows }
}
