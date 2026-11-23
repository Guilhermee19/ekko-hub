import { describe, expect, it } from 'vitest'
import type { HistoryPoint, ProcessGroup, SystemSnapshot } from '@/lib/ipc'
import {
  HISTORY_LEN,
  appendPoint,
  filterSort,
  formatBytes,
  formatRate,
  formatUptime,
  killMessage,
  sparkPoints,
  temperatureCard,
  toPoint,
} from './metrics'
import { scanProgress } from './store'

const GB = 1024 ** 3

const group = (label: string, memory: number, cpu: number): ProcessGroup => ({
  name: `${label.toLowerCase()}.exe`,
  label,
  path: null,
  count: 1,
  cpu,
  memory,
  protection: 'ok',
  processes: [],
})

describe('mypc metrics', () => {
  it('formats sizes, speeds and uptime in pt-BR', () => {
    expect(formatBytes(640 * 1024 ** 2)).toBe('640 MB')
    expect(formatBytes(1.8 * GB)).toBe('1,8 GB')
    expect(formatBytes(490 * GB)).toBe('490 GB')
    expect(formatRate(525_000)).toBe('4,2 Mb/s')
    expect(formatRate(1000)).toBe('8 Kb/s')
    expect(formatUptime(6 * 3600 + 12 * 60)).toBe('6 h 12 min')
    expect(formatUptime(3 * 86400)).toBe('3 dias')
  })

  it('builds history points and keeps the last 60', () => {
    const snap: SystemSnapshot = {
      atMs: 1,
      cpu: { total: 30, cores: [], brand: '' },
      memory: { used: 4 * GB, total: 16 * GB, swapUsed: 0, swapTotal: 0 },
      uptimeSecs: 0,
      disks: [{ mount: 'C:\\', label: '', total: 100, available: 25, removable: false }],
      network: { rxPerSec: 10, txPerSec: 5 },
      gpu: null,
      temperature: null,
      processCount: 0,
    }
    const p = toPoint(snap)
    expect(p).toMatchObject({ cpu: 30, ram: 25, disk: 75, net: 15, gpu: null })
    let h: HistoryPoint[] = []
    for (let i = 0; i < HISTORY_LEN + 5; i++) h = appendPoint(h, { ...p, atMs: i })
    expect(h).toHaveLength(HISTORY_LEN)
    expect(h[0].atMs).toBe(5)
    expect(appendPoint(h, h[h.length - 1])).toBe(h)
  })

  it('temperature card: system first, GPU under it or alone, null without sensors', () => {
    const snap = (system: number | null, gpu: number | null) =>
      ({
        temperature: system,
        gpu:
          gpu == null
            ? null
            : { usage: 0, name: null, vramUsed: null, vramTotal: null, temperature: gpu },
      }) as SystemSnapshot
    expect(temperatureCard(snap(65, 54))).toEqual({
      value: 65,
      sub: 'GPU 54 °C · Normal',
      hot: false,
    })
    expect(temperatureCard(snap(65, null))).toEqual({ value: 65, sub: 'Normal', hot: false })
    expect(temperatureCard(snap(null, 54))).toEqual({
      value: 54,
      sub: 'Da GPU · Normal',
      hot: false,
    })
    expect(temperatureCard(snap(null, null)).value).toBeNull()
    // A GPU at 85 °C is normal under load; the system zone at 85 °C is not.
    expect(temperatureCard(snap(60, 85)).hot).toBe(false)
    expect(temperatureCard(snap(85, 50)).sub).toBe('GPU 50 °C · Esquentando')
    expect(temperatureCard(snap(60, 90)).hot).toBe(true)
    expect(
      toPoint({
        ...snap(null, 54),
        cpu: { total: 0, cores: [], brand: '' },
        memory: { used: 0, total: 1, swapUsed: 0, swapTotal: 0 },
        disks: [],
        network: { rxPerSec: 0, txPerSec: 0 },
      } as SystemSnapshot).temp,
    ).toBe(54)
  })

  it('filters by name and sorts', () => {
    const groups = [group('Chrome', 3 * GB, 2), group('Code', GB, 9), group('Discord', 2 * GB, 1)]
    expect(filterSort(groups, '', 'memory').map((g) => g.label)).toEqual([
      'Chrome',
      'Discord',
      'Code',
    ])
    expect(filterSort(groups, '', 'cpu')[0].label).toBe('Code')
    expect(filterSort(groups, 'co', 'name').map((g) => g.label)).toEqual(['Code', 'Discord'])
    expect(filterSort(groups, 'CHROME.EXE', 'name')).toHaveLength(1)
  })

  it('describes kill results', () => {
    const ok = { name: 'a.exe', results: [], ended: 3, failed: 0 }
    expect(killMessage('App', ok)).toBe('App finalizado')
    const denied = {
      name: 'a.exe',
      results: [{ pid: 1, outcome: 'failed' as const, error: 'sem permissão' }],
      ended: 0,
      failed: 1,
    }
    expect(killMessage('App', denied)).toBe('Não consegui finalizar App: sem permissão')
  })

  it('scan progress counts running steps as half', () => {
    expect(
      scanProgress([
        { id: 'a', label: 'A', status: 'ok' },
        { id: 'b', label: 'B', status: 'running' },
        { id: 'c', label: 'C', status: 'pending' },
        { id: 'd', label: 'D', status: 'warn' },
      ]),
    ).toBe(0.625)
  })

  it('sparkPoints maps the domain to the box (y grows downward)', () => {
    expect(sparkPoints([0, 50, 100], 100, 20, 0, 100)).toBe('0.0,20.0 50.0,10.0 100.0,0.0')
    expect(sparkPoints([], 100, 20, 0, 100)).toBe('')
  })
})
