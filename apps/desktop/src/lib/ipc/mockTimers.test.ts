import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockTimers } from './mockTimers'

function setup() {
  const fired: [string, unknown][] = []
  const showAlarm = vi.fn(() => Promise.resolve())
  const api = mockTimers({
    on: () => Promise.resolve(() => {}),
    fire: (event, payload) => fired.push([event, payload]),
    showAlarm,
  })
  return { api, fired, showAlarm }
}

describe('mockTimers', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires the alarm and drops the timer when it ends', async () => {
    const { api, showAlarm } = setup()
    const snap = await api.timerAdd('  Chá ', 2)
    const id = snap.timers[0].id
    expect(snap.timers[0]).toMatchObject({ label: 'Chá', totalMs: 2000, pausedLeftMs: null })
    vi.advanceTimersByTime(2250)
    expect(showAlarm).toHaveBeenCalledWith(
      expect.objectContaining({ id, kind: 'timer', title: 'Chá' }),
    )
    expect((await api.listTimers()).timers.some((t) => t.id === id)).toBe(false)
  })

  it('pause keeps the time left; extend adds to it', async () => {
    const { api } = setup()
    const id = (await api.timerAdd('x', 60)).timers[0].id
    vi.advanceTimersByTime(10_000)
    const paused = (await api.timerPause(id)).timers[0]
    expect(paused.pausedLeftMs).toBe(50_000)
    const extended = (await api.timerExtend(id, 30)).timers[0]
    expect(extended).toMatchObject({ pausedLeftMs: 80_000, totalMs: 90_000 })
  })

  it('pomodoro advances to an idle break when focus ends', async () => {
    const { api, showAlarm } = setup()
    const start = await api.pomodoro('start')
    const cycles = start.pomodoro.cycles
    vi.advanceTimersByTime(25 * 60_000 + 250)
    const { pomodoro } = await api.listTimers()
    expect(pomodoro).toMatchObject({ phase: 'break', endsAtMs: null, cycles: cycles + 1 })
    expect(showAlarm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Foco concluído' }))
  })
})
