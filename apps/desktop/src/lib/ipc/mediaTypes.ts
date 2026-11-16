// Mirrors crates/ekko-os media.rs (`NowPlaying`, serde camelCase).

/** What the PC reports as playing (Windows media overlay): Spotify, browser tabs... */
export interface NowPlaying {
  title: string
  artist: string
  album: string
  /** Raw source id from Windows (e.g. `Spotify.exe`, `chrome`). */
  appId: string
  /** Friendly source name: "Spotify", "Chrome", "YouTube Music"... */
  source: string
  playing: boolean
  positionMs: number
  durationMs: number
  /** `data:image/...;base64,...` album art, when the player provides one. */
  thumbnail: string | null
}

export const MEDIA_CHANGED = 'ekko://media/changed'
