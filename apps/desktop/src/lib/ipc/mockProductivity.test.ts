import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockProductivity, stepRepeat } from './mockProductivity'

function setup() {
  const fired: [string, unknown][] = []
  const showAlarm = vi.fn(() => Promise.resolve())
  const api = mockProductivity({
    on: () => Promise.resolve(() => {}),
    fire: (event, payload) => fired.push([event, payload]),
    showAlarm,
  })
  return { api, fired, showAlarm }
}

describe('mockProductivity', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 15, 10, 0) }))
  afterEach(() => vi.useRealTimers())

  it('starts empty with default habits', async () => {
    const { api } = setup()
    expect(await api.listTasks()).toEqual({ tasks: [], reminders: [] })
    const habits = await api.listHabits()
    expect(habits.water).toEqual({ count: 0, goal: 8 })
    expect(habits.habits.map((h) => h.label)).toEqual([
      'Leitura',
      'Exercício',
      'Pausas para os olhos',
      'Alongar',
    ])
  })

  it('fires a due reminder once and reschedules repeating ones', async () => {
    const { api, fired, showAlarm } = setup()
    const now = Date.now()
    await api.reminderAdd('Ligar', now + 2000)
    await api.reminderAdd('Remédio', now + 2000, 'daily')
    vi.advanceTimersByTime(3000)
    expect(showAlarm).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reminder', title: 'Ligar' }),
    )
    expect(fired).toContainEqual(['ekko://notify', expect.objectContaining({ kind: 'reminder' })])
    const { reminders } = await api.listTasks()
    expect(reminders).toEqual([
      expect.objectContaining({ text: 'Remédio', atMs: now + 2000 + 86_400_000 }),
    ])
  })

  it('completing a repeating task moves its due date', async () => {
    const { api } = setup()
    const now = Date.now()
    const snap = await api.taskAdd({ title: 'Vitamina', dueMs: now, repeat: 'daily' })
    const t = (await api.taskToggle(snap.tasks[0].id)).tasks[0]
    expect(t).toMatchObject({ done: false, dueMs: now + 86_400_000 })
  })

  it('monthly repeat clamps the day', () => {
    const jan31 = new Date(2027, 0, 31, 9).getTime()
    expect(new Date(stepRepeat('monthly', jan31)).getDate()).toBe(28)
  })
})
