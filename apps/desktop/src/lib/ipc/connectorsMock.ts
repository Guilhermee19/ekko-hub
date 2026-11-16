import type { ConnectorsBackend, HaEntity, HomeAssistantStatus } from './connectors'

// Gallery stand-in: any URL + token "connects" after a short delay.

let ha: HomeAssistantStatus = {
  url: null,
  hasToken: false,
  connected: false,
  version: null,
  locationName: null,
  error: null,
}

let entities: HaEntity[] = [
  { entityId: 'light.sala', name: 'Luz da sala', state: 'on', domain: 'light' },
  { entityId: 'light.quarto', name: 'Luz do quarto', state: 'off', domain: 'light' },
  { entityId: 'switch.cafeteira', name: 'Cafeteira', state: 'off', domain: 'switch' },
  { entityId: 'fan.escritorio', name: 'Ventilador', state: 'on', domain: 'fan' },
  { entityId: 'sensor.temperatura', name: 'Temperatura', state: '23', domain: 'sensor' },
]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function requireConnected() {
  if (!ha.connected) throw new Error('Home Assistant não está conectado')
}

export const mockConnectors: ConnectorsBackend = {
  haStatus: () => Promise.resolve({ ...ha }),
  haSet: async (url, token) => {
    const trimmed = url.trim().replace(/\/+$/, '')
    if (!trimmed) throw new Error('informe o endereço do Home Assistant')
    await wait(800)
    const hasToken = ha.hasToken || Boolean(token.trim())
    const base = trimmed.includes('://') ? trimmed : `http://${trimmed}`
    ha = {
      url: base,
      hasToken,
      connected: hasToken,
      version: hasToken ? '2026.11.1' : null,
      locationName: hasToken ? 'Casa' : null,
      error: null,
    }
    return { ...ha }
  },
  haDisconnect: () => {
    ha = { ...ha, url: null, hasToken: false, connected: false, version: null, locationName: null }
    return Promise.resolve({ ...ha })
  },
  haEntities: async (domain) => {
    requireConnected()
    return entities.filter((e) => !domain || e.domain === domain)
  },
  haToggle: async (entityId) => {
    requireConnected()
    entities = entities.map((e) =>
      e.entityId === entityId ? { ...e, state: e.state === 'on' ? 'off' : 'on' } : e,
    )
    return entities.filter((e) => e.entityId === entityId)
  },
  claudeCodeStatus: async () => {
    await wait(400)
    return {
      found: true,
      path: 'C:\\Users\\voce\\AppData\\Roaming\\npm\\claude.cmd',
      version: '2.1.3 (Claude Code)',
    }
  },
}
