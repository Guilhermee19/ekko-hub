import { create } from 'zustand'
import { useAssistant } from '@/stores/assistant'
import { CHECKS, type CheckStatus } from './diagnosticsChecks'
import type { Autonomy, ToolOverride } from './toolsModel'

// Mock prefs for the "Sistema" settings pages (tools, privacy, connections, diagnostics).
// F2+ swaps the setters for `lib/ipc` calls with the same shape.

export type ConnStatus = 'connected' | 'disconnected' | 'connecting' | 'unavailable'
export type ConnId = 'spotify' | 'calendar' | 'claude' | 'tuya' | 'cameras' | 'homeassistant'

export interface ApiKey {
  id: string
  label: string
  saved: boolean
}

export interface McpServer {
  id: string
  name: string
  command: string
  args: string
  running: boolean
  tools: number
}

export interface CheckState {
  status: CheckStatus
  detail: string
}

interface PrefsSystem {
  autonomy: Autonomy
  toolEnabled: Record<string, boolean>
  toolOverride: Record<string, ToolOverride>
  apiKeys: ApiKey[]
  auditRetention: '7' | '30' | '90'
  historyRetention: '7' | '30' | '90' | 'forever'
  connections: Record<ConnId, ConnStatus>
  mcpServers: McpServer[]
  checks: Record<string, CheckState>
  checking: boolean

  setAutonomy: (a: Autonomy) => void
  setToolEnabled: (id: string, on: boolean) => void
  setToolOverride: (id: string, o: ToolOverride) => void
  removeKey: (id: string) => void
  setAuditRetention: (d: PrefsSystem['auditRetention']) => void
  setHistoryRetention: (d: PrefsSystem['historyRetention']) => void
  clearHistory: () => void
  connect: (id: ConnId) => void
  disconnect: (id: ConnId) => void
  addMcpServer: (s: Pick<McpServer, 'name' | 'command' | 'args'>) => void
  removeMcpServer: (id: string) => void
  runDiagnostics: () => void
}

export const toast = (text: string) => useAssistant.getState().set({ toast: text })

const idleChecks = () =>
  Object.fromEntries(CHECKS.map((c) => [c.id, { status: 'pending', detail: '' }])) as Record<
    string,
    CheckState
  >

export const usePrefsSystem = create<PrefsSystem>((set, get) => ({
  autonomy: 'balanced',
  toolEnabled: { input: false, shell: false },
  toolOverride: {},
  apiKeys: [
    { id: 'groq', label: 'Groq', saved: true },
    { id: 'gemini', label: 'Google Gemini', saved: true },
    { id: 'anthropic', label: 'Anthropic (Claude)', saved: false },
    { id: 'openai', label: 'OpenAI', saved: false },
  ],
  auditRetention: '30',
  historyRetention: '30',
  connections: {
    spotify: 'connected',
    calendar: 'disconnected',
    claude: 'connected',
    tuya: 'disconnected',
    cameras: 'disconnected',
    homeassistant: 'disconnected',
  },
  mcpServers: [
    {
      id: 'm1',
      name: 'filesystem',
      command: 'npx',
      args: '-y @modelcontextprotocol/server-filesystem C:\\Users',
      running: true,
      tools: 11,
    },
    {
      id: 'm2',
      name: 'github',
      command: 'npx',
      args: '-y @modelcontextprotocol/server-github',
      running: false,
      tools: 0,
    },
  ],
  checks: idleChecks(),
  checking: false,

  setAutonomy: (autonomy) => set({ autonomy }),
  setToolEnabled: (id, on) => set((s) => ({ toolEnabled: { ...s.toolEnabled, [id]: on } })),
  setToolOverride: (id, o) => set((s) => ({ toolOverride: { ...s.toolOverride, [id]: o } })),
  removeKey: (id) => {
    set((s) => ({ apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, saved: false } : k)) }))
    toast('Chave removida do Gerenciador de Credenciais')
  },
  setAuditRetention: (auditRetention) => set({ auditRetention }),
  setHistoryRetention: (historyRetention) => set({ historyRetention }),
  clearHistory: () => toast('Histórico de conversa apagado'),
  connect: (id) => {
    set((s) => ({ connections: { ...s.connections, [id]: 'connecting' } }))
    window.setTimeout(() => {
      set((s) => ({ connections: { ...s.connections, [id]: 'connected' } }))
      toast('Conectado')
    }, 1200)
  },
  disconnect: (id) => set((s) => ({ connections: { ...s.connections, [id]: 'disconnected' } })),
  addMcpServer: ({ name, command, args }) => {
    const server: McpServer = {
      id: `m${Date.now()}`,
      name,
      command,
      args,
      running: false,
      tools: 0,
    }
    set((s) => ({ mcpServers: [...s.mcpServers, server] }))
    // Pretend the server boots and lists its tools.
    window.setTimeout(() => {
      set((s) => ({
        mcpServers: s.mcpServers.map((m) =>
          m.id === server.id ? { ...m, running: true, tools: 4 } : m,
        ),
      }))
    }, 1500)
  },
  removeMcpServer: (id) => set((s) => ({ mcpServers: s.mcpServers.filter((m) => m.id !== id) })),
  runDiagnostics: () => {
    if (get().checking) return
    set({ checking: true, checks: idleChecks() })
    // Runs the mock probes one after another, like the real sequential checker will.
    const step = (i: number) => {
      const def = CHECKS[i]
      if (!def) {
        set({ checking: false })
        return
      }
      const patch = (c: CheckState) => set((s) => ({ checks: { ...s.checks, [def.id]: c } }))
      patch({ status: 'running', detail: 'Testando…' })
      window.setTimeout(() => {
        patch({ status: def.outcome, detail: def.detail })
        step(i + 1)
      }, def.ms)
    }
    step(0)
  },
}))
