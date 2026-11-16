import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { CalendarEvent, CalendarReminder, IntegrationsBackend } from './integrations'

const EVENTS = {
  calendarChanged: 'ekko://calendar/changed',
  calendarSoon: 'ekko://calendar/soon',
} as const

export const tauriIntegrations: IntegrationsBackend = {
  integrationStatus: () => invoke('integration_status'),
  setIntegrationClient: (provider, clientId, clientSecret) =>
    invoke('set_integration_client', { provider, clientId, clientSecret: clientSecret ?? null }),
  connectSpotify: () => invoke('connect_spotify'),
  connectGoogle: () => invoke('connect_google'),
  disconnectIntegration: (provider) => invoke('disconnect_integration', { provider }),
  calendarUpcoming: () => invoke('calendar_upcoming'),
  onCalendarChanged: (cb) => listen<CalendarEvent[]>(EVENTS.calendarChanged, (e) => cb(e.payload)),
  onCalendarSoon: (cb) => listen<CalendarReminder>(EVENTS.calendarSoon, (e) => cb(e.payload)),
  spotifyState: () => invoke('spotify_state'),
  spotifyDevices: () => invoke('spotify_devices'),
  spotifyQueue: () => invoke('spotify_queue'),
  spotifyTransfer: (deviceId) => invoke('spotify_transfer', { deviceId }),
  spotifyControl: (action) => invoke('spotify_control', { action }),
  openExternal: (url) => invoke('open_external', { url }),
}
