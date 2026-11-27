import type {
  CalendarAck,
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
import { mockMailAccount } from './mailMock'

// Gallery stand-in: fake login after a short delay, agenda with events around "now".

const status: IntegrationStatus = {
  spotify: { connected: false, account: null, clientId: null, hasSecret: false, builtIn: false },
  // Like a published build: Google connects with one click.
  google: { connected: false, account: null, clientId: null, hasSecret: false, builtIn: true },
  gmail: { connected: false, account: null, clientId: null, hasSecret: false, builtIn: true },
  outlook: { connected: false, account: null, clientId: null, hasSecret: false, builtIn: true },
}
const ACCOUNTS: Record<IntegrationProvider, string> = {
  spotify: 'Ana',
  google: 'guilherme@gmail.com',
  gmail: 'guilherme@gmail.com',
  outlook: 'guilherme@hotmail.com',
}

const calendarListeners = new Set<(events: CalendarEvent[]) => void>()
const soonListeners = new Set<(r: CalendarReminder) => void>()
const ackListeners = new Set<(acked: CalendarAck[]) => void>()
let acked: CalendarAck[] = []

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

/** Fake month: today's agenda plus a few repeating things on the other days. */
export function mockRange(fromMs: number, toMs: number, now = Date.now()): CalendarEvent[] {
  const ev = (id: string, title: string, startMs: number, minutes: number, allDay = false) => ({
    id,
    title,
    startMs,
    endMs: startMs + minutes * MIN,
    allDay,
    location: null,
    meetLink: null,
    calendarName: 'Pessoal',
  })
  const today = new Date(now).setHours(0, 0, 0, 0)
  const out: CalendarEvent[] = []
  for (const d = new Date(fromMs); d.getTime() < toMs; d.setDate(d.getDate() + 1)) {
    const day = new Date(d).setHours(0, 0, 0, 0)
    if (day === today) continue
    const [n, week] = [d.getDate(), d.getDay()]
    const hour = (h: number, m = 0) => new Date(day).setHours(h, m)
    if (week >= 1 && week <= 5) out.push(ev(`daily-${day}`, 'Daily do time', hour(9, 30), 15))
    if (week === 2 || week === 4) out.push(ev(`gym-${day}`, 'Academia', hour(19), 60))
    if (n === 5) out.push(ev(`pay-${day}`, 'Pagamento', day, 24 * 60, true))
    if (n % 9 === 3) out.push(ev(`doc-${day}`, 'Dentista', hour(14), 45))
    if (n === 12) out.push(ev(`trip-${day}`, 'Viagem a Curitiba', hour(8), 2 * 24 * 60 + 600))
  }
  // Today keeps the same events the notch and the Início show.
  return [...out, ...mockEvents(now)].filter((e) => e.startMs < toMs && e.endMs > fromMs)
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
  if (!status[provider].clientId && !status[provider].builtIn)
    throw new Error('configure o Client ID antes de conectar')
  await wait(1200)
  status[provider] = { ...status[provider], connected: true, account: ACCOUNTS[provider] }
  if (provider === 'google') calendarListeners.forEach((cb) => cb(mockEvents()))
  if (provider === 'gmail' || provider === 'outlook') mockMailAccount(provider, ACCOUNTS[provider])
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
      hasSecret: (provider === 'google' || provider === 'gmail') && hasSecret,
    }
    return Promise.resolve(snapshot())
  },
  connectSpotify: () => connect('spotify'),
  connectGoogle: () => connect('google'),
  connectGmail: () => connect('gmail'),
  connectOutlook: () => connect('outlook'),
  disconnectIntegration: (provider) => {
    status[provider] = { ...status[provider], connected: false, account: null }
    if (provider === 'google') calendarListeners.forEach((cb) => cb([]))
    if (provider === 'gmail' || provider === 'outlook') mockMailAccount(provider, null)
    return Promise.resolve(snapshot())
  },
  calendarUpcoming: () => Promise.resolve(status.google.connected ? mockEvents() : []),
  calendarRange: (fromMs, toMs) =>
    Promise.resolve(status.google.connected ? mockRange(fromMs, toMs) : []),
  onCalendarChanged: (cb) => {
    calendarListeners.add(cb)
    return Promise.resolve(() => calendarListeners.delete(cb))
  },
  onCalendarSoon: (cb) => {
    soonListeners.add(cb)
    return Promise.resolve(() => soonListeners.delete(cb))
  },
  calendarAck: (id, startMs) => {
    if (!acked.some((a) => a.id === id && a.startMs === startMs)) {
      acked = [...acked, { id, startMs }]
      ackListeners.forEach((cb) => cb(acked))
    }
    return Promise.resolve()
  },
  calendarAcked: () => Promise.resolve(acked),
  onCalendarAcked: (cb) => {
    ackListeners.add(cb)
    return Promise.resolve(() => ackListeners.delete(cb))
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
