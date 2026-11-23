import { describe, expect, it } from 'vitest'
import { eventActivity, pickActivity, type LiveSources } from './liveActivity'

const idlePomodoro = {
  phase: 'focus' as const,
  endsAt: null,
  pausedLeft: null,
  cycles: 0,
  focusMin: 25,
  breakMin: 5,
}
const base: LiveSources = { timers: [], pomodoro: idlePomodoro, music: null, event: null }
const timer = { id: 't', label: 'Bolo', endsAt: 2_000, total: 300 }
const music = { title: 'Song', artist: 'Band', playing: true }
const event = { kind: 'event' as const, id: 'd', title: 'Daily', startsAt: 5_000, endsAt: 9_000 }

describe('pickActivity', () => {
  it('nothing live → null', () => {
    expect(pickActivity(base)).toBeNull()
  })

  it('default priority: timer > event > music', () => {
    expect(pickActivity({ ...base, timers: [timer], music, event })?.kind).toBe('timer')
    expect(pickActivity({ ...base, music, event })?.kind).toBe('event')
    expect(pickActivity({ ...base, music })?.kind).toBe('music')
  })

  it('respects custom priority and hidden kinds', () => {
    const src = { ...base, timers: [timer], music }
    expect(pickActivity(src, ['music', 'timer'])?.kind).toBe('music')
    expect(pickActivity(src, ['timer', 'music'], { timer: true })?.kind).toBe('music')
  })

  it('paused timers and paused music are skipped; pomodoro counts as a timer', () => {
    const paused = { ...timer, pausedLeft: 1000 }
    expect(
      pickActivity({ ...base, timers: [paused], music: { ...music, playing: false } }),
    ).toBeNull()
    const pomo = { ...idlePomodoro, endsAt: 3_000 }
    expect(pickActivity({ ...base, pomodoro: pomo })).toMatchObject({
      kind: 'timer',
      label: 'Foco',
      total: 1500,
    })
  })

  it('soonest running timer wins', () => {
    const later = { ...timer, id: 'u', label: 'Chá', endsAt: 9_000 }
    expect(pickActivity({ ...base, timers: [later, timer] })).toMatchObject({ label: 'Bolo' })
  })
})

describe('eventActivity', () => {
  const min = 60_000
  const ev = (id: string, startMin: number, endMin: number, allDay = false) => ({
    id,
    title: id,
    startMs: startMin * min,
    endMs: endMin * min,
    allDay,
    location: null,
    meetLink: null,
    calendarName: 'x',
  })

  it('shows an event within the lead (5 min by default) or running, never all-day ones', () => {
    expect(eventActivity([ev('a', 30, 60)], 0)).toBeNull()
    expect(eventActivity([ev('a', 10, 60)], 0)).toBeNull()
    expect(eventActivity([ev('a', 10, 60)], 0, 15)?.title).toBe('a')
    expect(eventActivity([ev('a', 4, 60)], 0)?.title).toBe('a')
    expect(eventActivity([ev('a', -5, 20)], 0)?.title).toBe('a')
    expect(eventActivity([ev('day', -60, 600, true)], 0)).toBeNull()
    expect(eventActivity([ev('done', -60, -1)], 0)).toBeNull()
  })

  it('picks the earliest one', () => {
    expect(eventActivity([ev('b', 4, 30), ev('a', 3, 30)], 0)?.title).toBe('a')
  })

  it('a confirmed event leaves the pill, even while it runs', () => {
    const running = ev('a', -5, 20)
    expect(eventActivity([running], 0, 5, [{ id: 'a', startMs: running.startMs }])).toBeNull()
    // Another occurrence of the same id is still shown.
    expect(eventActivity([running], 0, 5, [{ id: 'a', startMs: 0 }])?.title).toBe('a')
  })
})
