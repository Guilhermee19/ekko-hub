import { create } from 'zustand'
import { backend, type VolumeState } from '@/lib/ipc'
import { useSpotify } from '@/features/spotify/store'
import { useAssistant, type Activity } from '@/stores/assistant'
import { coalesce } from './coalesce'
import { volumeTarget, type Player, type VolumeTarget } from './nowPlaying'
import { useMusic } from './store'

// One volume slider, two targets: Spotify's device volume when Spotify is the player
// (and connected), otherwise the Windows master volume, which works with no login.
// Changes made through Ekko flash the notch's volume pill.

/** How long the notch shows the volume pill after a change. */
export const VOLUME_PILL_MS = 2500

const useWindowsVolume = create<VolumeState>(() => ({ level: 0, muted: false }))

const report = (err: unknown) => console.warn('[ekko] volume falhou', err)
const sendWindows = coalesce((level: number) => backend.volumeSet(level).then(adopt))

function adopt(state: VolumeState) {
  useWindowsVolume.setState(state)
}

backend.onVolumeChanged(adopt).catch(report)
backend.volumeGet().then(adopt, report)

function player(track: unknown, viaSpotify: boolean): Player {
  return track === null ? 'none' : viaSpotify ? 'spotify' : 'other'
}

function currentTarget(): VolumeTarget {
  const spotify = useSpotify.getState()
  const { track, viaSpotify } = useMusic.getState()
  const volume = spotify.playback?.device?.volume ?? null
  return volumeTarget(spotify.connected, player(track, viaSpotify), volume)
}

let pillTimer: ReturnType<typeof setTimeout> | undefined
/** What the pill replaced (an explicit activity), restored when it goes away. */
let underneath: Activity | null = null

/** Transient notch pill; clears itself unless another change replaced it. */
export function flashVolume(level: number) {
  const assistant = useAssistant.getState()
  if (assistant.activity?.kind !== 'volume') underneath = assistant.activity
  assistant.set({ activity: { kind: 'volume', level } })
  clearTimeout(pillTimer)
  pillTimer = setTimeout(() => {
    const now = useAssistant.getState()
    if (now.activity?.kind === 'volume' && now.activity.level === level)
      now.set({ activity: underneath })
    underneath = null
  }, VOLUME_PILL_MS)
}

/** Sets the volume (0..1) on the current target. */
export function setVolume(level: number) {
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
