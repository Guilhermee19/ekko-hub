import type { NowPlaying, SpotifyPlayback, SpotifyRepeat } from '@/lib/ipc'
import { coverOf } from './covers'
import type { Track } from './store'

/** `appId` for playback seen only through the Spotify API (phone, speaker...). */
export const SPOTIFY_REMOTE = 'spotify:remote'

/** Windows' "now playing" → the player's Track (cover is a CSS background value). */
export function toTrack(now: NowPlaying): Track {
  const id = `${now.appId}\u0001${now.title}\u0001${now.artist}`
  return {
    id,
    title: now.title,
    artist: now.artist,
    album: now.album,
    durationSec: Math.round(now.durationMs / 1000),
    cover: coverOf(now.thumbnail, id),
  }
}

/** Position (s) `elapsedMs` after the snapshot, clamped to the track (live streams: 0). */
export function positionAt(now: NowPlaying, elapsedMs: number): number {
  const ms = now.positionMs + (now.playing ? Math.max(0, elapsedMs) : 0)
  const clamped = now.durationMs > 0 ? Math.min(now.durationMs, ms) : ms
  return clamped / 1000
}

/** Spotify playing somewhere Windows can't see (another device) as a NowPlaying. */
export function fromSpotify(p: SpotifyPlayback): NowPlaying | null {
  if (!p.track) return null
  return {
    title: p.track.title,
    artist: p.track.artist,
    album: p.track.album,
    appId: SPOTIFY_REMOTE,
    source: p.device ? `Spotify (${p.device.name})` : 'Spotify',
    playing: p.playing,
    positionMs: p.progressMs,
    durationMs: p.track.durationMs,
    canSeek: true,
    thumbnail: p.track.coverUrl,
  }
}

/** The player is Spotify (desktop app via Windows, or a remote device via the API). */
export function isSpotify(now: NowPlaying | null): boolean {
  return now !== null && (now.appId === SPOTIFY_REMOTE || now.source === 'Spotify')
}

export type VolumeTarget = 'windows' | 'spotify'

/** Who is playing, from the volume's point of view. */
export type Player = 'spotify' | 'other' | 'none'

/** Spotify's own volume only when Spotify is (or may be) the player and its device
 * allows it; otherwise the Windows master volume. */
export function volumeTarget(
  connected: boolean,
  player: Player,
  spotifyVolume: number | null,
): VolumeTarget {
  return connected && spotifyVolume !== null && player !== 'other' ? 'spotify' : 'windows'
}

/** Repeat button cycle, Spotify-style: off → whole list → this track → off. */
export const NEXT_REPEAT: Record<SpotifyRepeat, SpotifyRepeat> = {
  off: 'context',
  context: 'track',
  track: 'off',
}
