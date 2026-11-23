// Mirrors crates/ekko-integrations + commands/integrations.rs (Spotify, Google Calendar).
import type { ConnectorsBackend } from './connectors'

export type * from './connectors'

export type IntegrationProvider = 'spotify' | 'google'

/** Redirect URI the user must register in the Spotify app (fixed port). */
export const SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:8890/callback'

export interface ProviderStatus {
  connected: boolean
  /** Spotify display name or Google e-mail. */
  account: string | null
  clientId: string | null
  /** Google only: client secret saved in the Credential Manager. */
  hasSecret: boolean
  /** This build ships its own client: connecting is one click, no setup. */
  builtIn: boolean
}

export interface IntegrationStatus {
  spotify: ProviderStatus
  google: ProviderStatus
}

export interface CalendarEvent {
  id: string
  title: string
  startMs: number
  endMs: number
  allDay: boolean
  location: string | null
  meetLink: string | null
  calendarName: string
}

/** `ekko://calendar/soon`: ~10 min before (`soon`) and at the start (`start`). */
export interface CalendarReminder {
  event: CalendarEvent
  /** `late`: started and nobody confirmed it yet (sent again per the settings). */
  phase: 'soon' | 'start' | 'late'
  /** Rounded up; 0 at start, negative once late (-5 = 5 min late). */
  minutesLeft: number
}

/** An event occurrence marked as seen: no more nudges, it leaves the notch. */
export interface CalendarAck {
  id: string
  startMs: number
}

export interface SpotifyTrack {
  id: string
  title: string
  artist: string
  album: string
  durationMs: number
  coverUrl: string | null
}

export interface SpotifyDevice {
  id: string
  name: string
  /** Lowercase Spotify type: computer, smartphone, speaker, tv… */
  kind: string
  active: boolean
  volume: number | null
}

export interface SpotifyPlayback {
  playing: boolean
  progressMs: number
  shuffle: boolean
  repeat: 'off' | 'track' | 'context'
  track: SpotifyTrack | null
  device: SpotifyDevice | null
}

export interface SpotifyQueue {
  current: SpotifyTrack | null
  queue: SpotifyTrack[]
}

export type SpotifyAction = 'play' | 'pause' | 'next' | 'previous'
export type SpotifyRepeat = SpotifyPlayback['repeat']

type Unlisten = () => void

/** Integration part of `Backend` (spread into the tauri and mock backends). */
export interface IntegrationsBackend extends ConnectorsBackend {
  integrationStatus(): Promise<IntegrationStatus>
  /** Client ID goes to settings; the Google secret goes to the Credential Manager. */
  setIntegrationClient(
    provider: IntegrationProvider,
    clientId: string,
    clientSecret?: string,
  ): Promise<IntegrationStatus>
  /** Opens the browser and resolves after the login (or rejects after ~3 min). */
  connectSpotify(): Promise<IntegrationStatus>
  connectGoogle(): Promise<IntegrationStatus>
  disconnectIntegration(provider: IntegrationProvider): Promise<IntegrationStatus>
  calendarUpcoming(): Promise<CalendarEvent[]>
  /** Events between two instants (epoch ms), past ones included: the month view. */
  calendarRange(fromMs: number, toMs: number): Promise<CalendarEvent[]>
  onCalendarChanged(cb: (events: CalendarEvent[]) => void): Promise<Unlisten>
  onCalendarSoon(cb: (reminder: CalendarReminder) => void): Promise<Unlisten>
  calendarAck(id: string, startMs: number): Promise<void>
  calendarAcked(): Promise<CalendarAck[]>
  onCalendarAcked(cb: (acked: CalendarAck[]) => void): Promise<Unlisten>
  spotifyState(): Promise<SpotifyPlayback | null>
  spotifyDevices(): Promise<SpotifyDevice[]>
  spotifyQueue(): Promise<SpotifyQueue>
  spotifyTransfer(deviceId: string): Promise<void>
  spotifyControl(action: SpotifyAction): Promise<void>
  spotifyShuffle(on: boolean): Promise<void>
  spotifyRepeat(mode: SpotifyRepeat): Promise<void>
  spotifySeek(positionMs: number): Promise<void>
  /** Volume of the active Spotify device, 0..100. */
  spotifyVolume(percent: number): Promise<void>
  /** Opens an http(s) link in the system browser. */
  openExternal(url: string): Promise<void>
}
