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
  /** The player accepts seeking (Windows reports it per session). */
  canSeek: boolean
  /** `data:image/...;base64,...` album art, when the player provides one. */
  thumbnail: string | null
}

export const MEDIA_CHANGED = 'ekko://media/changed'

/** Windows master volume (default playback device). Mirrors ekko-os volume.rs. */
export interface VolumeState {
  /** 0..1 */
  level: number
  muted: boolean
}

export const VOLUME_CHANGED = 'ekko://volume/changed'

/** Windows volume part of `Backend`: every call returns the new state. */
export interface VolumeBackend {
  volumeGet(): Promise<VolumeState>
  volumeSet(level: number): Promise<VolumeState>
  volumeStep(delta: number): Promise<VolumeState>
  volumeMute(on: boolean): Promise<VolumeState>
  onVolumeChanged(cb: (state: VolumeState) => void): Promise<() => void>
}
