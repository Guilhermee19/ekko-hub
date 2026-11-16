import type { NowPlaying } from '@/lib/ipc'
import { TRACKS } from './mock'
import type { Track } from './store'

/** Stand-in art when the player sends none: stable per track. */
function fallbackCover(key: string): string {
  let hash = 0
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TRACKS[Math.abs(hash) % TRACKS.length].cover
}

/** Windows' "now playing" → the player's Track (cover is a CSS background value). */
export function toTrack(now: NowPlaying): Track {
  const id = `${now.appId}\u0001${now.title}\u0001${now.artist}`
  return {
    id,
    title: now.title,
    artist: now.artist,
    album: now.album,
    durationSec: Math.round(now.durationMs / 1000),
    cover: now.thumbnail ? `url("${now.thumbnail}") center/cover` : fallbackCover(id),
  }
}

/** Position (s) `elapsedMs` after the snapshot, clamped to the track (live streams: 0). */
export function positionAt(now: NowPlaying, elapsedMs: number): number {
  const ms = now.positionMs + (now.playing ? Math.max(0, elapsedMs) : 0)
  const clamped = now.durationMs > 0 ? Math.min(now.durationMs, ms) : ms
  return clamped / 1000
}
