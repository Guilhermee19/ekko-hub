import type {
  CalendarEvent,
  CalendarReminder,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationsBackend,
  SpotifyDevice,
  SpotifyRepeat,
  SpotifyTrack,
} from './integrations'
import { mockConnectors } from './connectorsMock'

// Gallery stand-in: fake login after a short delay, agenda with events around "now".

const status: IntegrationStatus = {
  spotify: { connected: false, account: null, clientId: null, hasSecret: false },
  google: { connected: false, account: null, clientId: null, hasSecret: false },
}
const ACCOUNTS: Record<IntegrationProvider, string> = {
  spotify: 'Guilherme',
  google: 'guilherme@gmail.com',
}

const calendarListeners = new Set<(events: CalendarEvent[]) => void>()
const soonListeners = new Set<(r: CalendarReminder) => void>()

const MIN = 60_000
const snapshot = (): IntegrationStatus => structuredClone(status)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function at(hour: number, minute = 0): number {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

/** Fake agenda for today: one meeting in 25 min plus fixed slots. */
export function mockEvents(now = Date.now()): CalendarEvent[] {
  const soon = Math.ceil((now + 25 * MIN) / (5 * MIN)) * 5 * MIN
  const ev = (
    id: string,
    title: string,
    startMs: number,
    minutes: number,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => ({
    id,
    title,
    startMs,
    endMs: startMs + minutes * MIN,
    allDay: false,
    location: null,
    meetLink: null,
    calendarName: 'Pessoal',
    ...extra,
  })
  return [
    ev('allday', 'Aniversário da Ana', at(0), 24 * 60, { allDay: true }),
    ev('daily', 'Daily do time', soon, 15, {
      meetLink: 'https://meet.google.com/abc-defg-hij',
      calendarName: 'Trabalho',
    }),
    ev('lunch', 'Almoço com o Rafa', at(12, 30), 60, { location: 'Restaurante Mocotó' }),
    ev('review', 'Review da sprint', at(16), 45, {
      meetLink: 'https://meet.google.com/xyz-abcd-efg',
      calendarName: 'Trabalho',
    }),
    ev('gym', 'Academia', at(19), 60),
  ]
    .filter((e) => e.endMs > now)
    .sort((a, b) => a.startMs - b.startMs)
}

const track = (id: string, title: string, artist: string, album: string): SpotifyTrack => ({
  id,
  title,
  artist,
  album,
  durationMs: 210_000,
  coverUrl: null,
})

let devices: SpotifyDevice[] = [
  { id: 'pc', name: 'Este PC', kind: 'computer', active: true, volume: 70 },
  { id: 'phone', name: 'Celular', kind: 'smartphone', active: false, volume: 50 },
  { id: 'echo', name: 'Caixa da sala', kind: 'speaker', active: false, volume: 40 },
]

const QUEUE = [
  track('q1', 'Sozinho', 'Caetano Veloso', 'Prenda Minha'),
  track('q2', 'Tempo Perdido', 'Legião Urbana', 'Dois'),
  track('q3', 'Garota de Ipanema', 'Tom Jobim', 'Getz/Gilberto'),
]

const player = { shuffle: false, repeat: 'off' as SpotifyRepeat, progressMs: 42_000 }

const setActiveVolume = (percent: number) => {
  devices = devices.map((d) => (d.active ? { ...d, volume: Math.round(percent) } : d))
}

function requireConnected(provider: IntegrationProvider) {
  if (!status[provider].connected) throw new Error(`${provider} não está conectado`)
}

async function connect(provider: IntegrationProvider): Promise<IntegrationStatus> {
  if (!status[provider].clientId) throw new Error('configure o Client ID antes de conectar')
  await wait(1200)
  status[provider] = { ...status[provider], connected: true, account: ACCOUNTS[provider] }
  if (provider === 'google') calendarListeners.forEach((cb) => cb(mockEvents()))
  return snapshot()
}

export const mockIntegrations: IntegrationsBackend = {
  ...mockConnectors,
  integrationStatus: () => Promise.resolve(snapshot()),
  setIntegrationClient: (provider, clientId, clientSecret) => {
    const id = clientId.trim() || null
    const hasSecret = status[provider].hasSecret || Boolean(clientSecret?.trim())
    status[provider] = {
      ...status[provider],
      clientId: id,
      hasSecret: provider === 'google' && hasSecret,
    }
    return Promise.resolve(snapshot())
  },
  connectSpotify: () => connect('spotify'),
  connectGoogle: () => connect('google'),
  disconnectIntegration: (provider) => {
    status[provider] = { ...status[provider], connected: false, account: null }
    if (provider === 'google') calendarListeners.forEach((cb) => cb([]))
    return Promise.resolve(snapshot())
  },
  calendarUpcoming: () => Promise.resolve(status.google.connected ? mockEvents() : []),
  onCalendarChanged: (cb) => {
    calendarListeners.add(cb)
    return Promise.resolve(() => calendarListeners.delete(cb))
  },
  onCalendarSoon: (cb) => {
    soonListeners.add(cb)
    return Promise.resolve(() => soonListeners.delete(cb))
  },
  spotifyState: async () => {
    requireConnected('spotify')
    const active = devices.find((d) => d.active) ?? null
    return {
      playing: true,
      ...player,
      track: QUEUE[0] ?? null,
      device: active,
    }
  },
  spotifyDevices: async () => {
    requireConnected('spotify')
    return devices
  },
  spotifyQueue: async () => {
    requireConnected('spotify')
    return { current: QUEUE[0] ?? null, queue: QUEUE.slice(1) }
  },
  spotifyTransfer: async (deviceId) => {
    requireConnected('spotify')
    devices = devices.map((d) => ({ ...d, active: d.id === deviceId }))
  },
  spotifyControl: async () => requireConnected('spotify'),
  spotifyShuffle: async (on) => {
    requireConnected('spotify')
    player.shuffle = on
  },
  spotifyRepeat: async (mode) => {
    requireConnected('spotify')
    player.repeat = mode
  },
  spotifySeek: async (positionMs) => {
    requireConnected('spotify')
    player.progressMs = positionMs
  },
  spotifyVolume: async (percent) => {
    requireConnected('spotify')
    setActiveVolume(percent)
  },
  openExternal: (url) => {
    window.open(url, '_blank', 'noopener')
    return Promise.resolve()
  },
}

/** Gallery helper: fires a reminder as the Rust poller would. */
export function mockCalendarSoon(reminder: CalendarReminder) {
  soonListeners.forEach((cb) => cb(reminder))
}
