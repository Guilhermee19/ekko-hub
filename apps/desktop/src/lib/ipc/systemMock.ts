import type { Unlisten } from './types'
import {
  PROCESSES_CHANGED,
  SCAN_PROGRESS,
  SYSTEM_CHANGED,
  type AuditLogEntry,
  type HistoryPoint,
  type ProcessGroup,
  type ScanCheck,
  type SortBy,
  type SystemBackend,
  type SystemSnapshot,
} from './systemTypes'

// Gallery stand-in: plausible telemetry that wanders, a fake process list, a scripted
// scan. Nothing on the real PC is touched.

interface Deps {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
}

const GB = 1024 ** 3
const MB = 1024 ** 2
const TICK_MS = 1500

const app = (
  name: string,
  label: string,
  count: number,
  memMb: number,
  cpu: number,
  protection: ProcessGroup['protection'] = 'ok',
): ProcessGroup => ({
  name,
  label,
  path: `C:\\Program Files\\${label}\\${name}`,
  count,
  cpu,
  memory: memMb * MB,
  protection,
  processes: Array.from({ length: count }, (_, i) => ({
    pid: 1000 + label.length * 97 + i,
    cpu: i === 0 ? cpu : 0,
    memory: Math.round((memMb * MB) / count),
  })),
})

const APPS: ProcessGroup[] = [
  app('chrome.exe', 'Google Chrome', 28, 2150, 6.2),
  app('Code.exe', 'Visual Studio Code', 14, 1240, 2.1),
  app('Discord.exe', 'Discord', 6, 610, 0.8),
  app('Spotify.exe', 'Spotify', 5, 420, 0.4),
  app('explorer.exe', 'Windows Explorer', 1, 180, 0.3, 'warn'),
  app('svchost.exe', 'Host Process for Windows Services', 84, 900, 1.1, 'protected'),
  app('MsMpEng.exe', 'Antimalware Service Executable', 1, 260, 0.6, 'protected'),
]

const sorted = (groups: ProcessGroup[], by: SortBy = 'memory') =>
  [...groups].sort((a, b) =>
    by === 'name'
      ? a.label.localeCompare(b.label, 'pt-BR')
      : by === 'cpu'
        ? b.cpu - a.cpu
        : b.memory - a.memory,
  )

const wave = (t: number, period: number, base: number, swing: number) =>
  base + swing * Math.sin((t / period) * 2 * Math.PI) + (Math.random() - 0.5) * swing * 0.6

function fakeSnapshot(t: number): SystemSnapshot {
  const cpu = Math.min(100, Math.max(2, wave(t, 47, 28, 12)))
  return {
    atMs: t * 1000,
    cpu: {
      total: cpu,
      cores: Array.from({ length: 16 }, () => Math.min(100, cpu * (0.4 + Math.random() * 1.2))),
      brand: 'AMD Ryzen 7 5700X 8-Core Processor',
    },
    memory: {
      used: wave(t, 120, 10.9, 0.4) * GB,
      total: 16 * GB,
      swapUsed: 3 * GB,
      swapTotal: 16 * GB,
    },
    uptimeSecs: 6 * 3600 + (t % 3600),
    disks: [
      { mount: 'C:\\', label: 'Windows', total: 931 * GB, available: 142 * GB, removable: false },
    ],
    network: { rxPerSec: Math.max(0, wave(t, 29, 600, 500)) * 1024, txPerSec: 60 * 1024 },
    gpu: {
      usage: Math.max(0, wave(t, 61, 18, 10)),
      name: 'NVIDIA GeForce RTX 3060',
      vramUsed: 2.1 * GB,
      vramTotal: 12 * GB,
      temperature: Math.round(wave(t, 47, 52, 6)),
    },
    temperature: Math.round(wave(t, 53, 58, 7)),
    processCount: 312,
  }
}

const point = (s: SystemSnapshot): HistoryPoint => ({
  atMs: s.atMs,
  cpu: s.cpu.total,
  ram: (s.memory.used / s.memory.total) * 100,
  gpu: s.gpu?.usage ?? null,
  disk: ((s.disks[0].total - s.disks[0].available) / s.disks[0].total) * 100,
  net: s.network.rxPerSec + s.network.txPerSec,
  temp: s.temperature ?? s.gpu?.temperature ?? null,
})

export function mockSystem({ on, fire }: Deps): SystemBackend {
  let groups = APPS
  let tempBytes = 1.8 * GB
  let binBytes = 640 * MB
  const audit: AuditLogEntry[] = []
  const now = () => Math.floor(Date.now() / 1000)
  const history: HistoryPoint[] = Array.from({ length: 40 }, (_, i) =>
    point(fakeSnapshot(now() - (40 - i) * 1.5)),
  )
  let timer: ReturnType<typeof setInterval> | undefined

  const start = () => {
    if (timer) return
    timer = setInterval(() => {
      const snap = fakeSnapshot(now())
      history.push(point(snap))
      if (history.length > 60) history.shift()
      fire(SYSTEM_CHANGED, snap)
      fire(PROCESSES_CHANGED, sorted(groups))
    }, TICK_MS)
  }
  const log = (tool: string, detail: string, risk: AuditLogEntry['risk']) =>
    audit.unshift({ atMs: Date.now(), tool, detail, risk, result: 'ok', origin: 'ui' })

  const checks = (): ScanCheck[] => [
    check('memory', 'Memória', 'ok', '68% em uso (10,9 GB de 16 GB)'),
    check('cpu', 'Processador', 'ok', 'Uso de 28% agora, nada pesando'),
    {
      ...check('startup', 'Programas na inicialização', 'info', '6 programas abrem com o Windows'),
      action: { kind: 'openStartup' },
    },
    tempBytes > 0
      ? {
          ...check(
            'temp',
            'Arquivos temporários',
            'warn',
            '1,8 GB em temporários; 1,8 GB podem ser limpos',
          ),
          action: { kind: 'cleanTemp', bytes: tempBytes },
        }
      : check('temp', 'Arquivos temporários', 'ok', 'Nada antigo para limpar'),
    binBytes > 0
      ? {
          ...check('bin', 'Lixeira', 'info', '640 MB na lixeira (37 itens)'),
          action: { kind: 'emptyRecycleBin', bytes: binBytes },
        }
      : check('bin', 'Lixeira', 'ok', 'Lixeira vazia'),
    check('disk', 'Espaço em disco', 'ok', '142 GB livres em C:'),
  ]

  return {
    systemSnapshot: () => Promise.resolve(fakeSnapshot(now())),
    systemHistory: () => Promise.resolve([...history]),
    systemProcesses: (by) => Promise.resolve(sorted(groups, by)),
    onSystemChanged: (cb) => {
      start()
      return on(SYSTEM_CHANGED, (s) => cb(s as SystemSnapshot))
    },
    onProcessesChanged: (cb) => {
      start()
      return on(PROCESSES_CHANGED, (g) => cb(g as ProcessGroup[]))
    },
    onScanProgress: (cb) => on(SCAN_PROGRESS, (p) => cb(p as never)),
    systemKill: ({ name, pid }) => {
      const target = groups.find((g) => g.name === name || g.processes.some((p) => p.pid === pid))
      if (!target || target.protection === 'protected')
        return Promise.reject(new Error('processo protegido ou não encontrado'))
      groups = groups.filter((g) => g !== target)
      log('system.kill', `${target.name}: ${target.count} finalizado(s)`, 'confirm')
      return Promise.resolve({
        name: target.name,
        results: target.processes.map((p) => ({ pid: p.pid, outcome: 'closed', error: null })),
        ended: target.count,
        failed: 0,
      })
    },
    systemScan: async () => {
      const all = checks()
      for (const [index, c] of all.entries()) {
        const base = { index, total: all.length, id: c.id, label: c.label }
        fire(SCAN_PROGRESS, { ...base, check: null })
        await new Promise((r) => setTimeout(r, 650))
        fire(SCAN_PROGRESS, { ...base, check: c })
      }
      return all
    },
    systemCleanTemp: () => {
      const freedBytes = tempBytes
      tempBytes = 0
      log('system.clean_temp', 'temporários antigos apagados', 'confirm')
      return Promise.resolve({ freedBytes, deletedFiles: 412, skippedFiles: 9 })
    },
    systemEmptyRecycleBin: () => {
      const freed = binBytes
      binBytes = 0
      log('system.empty_recycle_bin', 'lixeira esvaziada', 'dangerous')
      return Promise.resolve(freed)
    },
    systemOpenStartupSettings: () => Promise.resolve(),
    auditRecent: (limit = 100) => Promise.resolve(audit.slice(0, limit)),
  }
}

function check(id: string, label: string, status: ScanCheck['status'], finding: string): ScanCheck {
  return { id, label, status, finding, value: null, bytes: null, items: [], action: null }
}
