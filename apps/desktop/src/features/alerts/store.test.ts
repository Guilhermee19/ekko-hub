import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissAlert, holdAlert, resetAlerts, showAlert, useAlerts } from './store'

const titles = () => {
  const { current, queue } = useAlerts.getState()
  return [current?.title ?? null, ...queue.map((a) => a.title)]
}

describe('alert queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetAlerts()
  })
  afterEach(() => vi.useRealTimers())

  it('shows one at a time, in order, each for its own time', () => {
    showAlert({ kind: 'notice', label: 'Aviso', title: 'A', ms: 1000 })
    showAlert({ kind: 'notice', label: 'Aviso', title: 'B', ms: 1000 })
    expect(titles()).toEqual(['A', 'B'])
    vi.advanceTimersByTime(1000)
    expect(titles()).toEqual(['B'])
    vi.advanceTimersByTime(1000)
    expect(titles()).toEqual([null])
  })

  it('alarms jump the queue; a new song replaces the song on screen or waiting', () => {
    showAlert({ kind: 'music', label: 'Tocando agora', title: 'Song 1' })
    showAlert({ kind: 'music', label: 'Tocando agora', title: 'Song 2' })
    expect(titles()).toEqual(['Song 2'])
    showAlert({ kind: 'notice', label: 'Aviso', title: 'Água' })
    showAlert({ kind: 'timer', label: 'Timer terminou', title: 'Pão' })
    expect(titles()).toEqual(['Song 2', 'Pão', 'Água'])
  })

  it('hovering keeps the card; leaving counts again', () => {
    showAlert({ kind: 'notice', label: 'Aviso', title: 'A', ms: 1000 })
    holdAlert(true)
    vi.advanceTimersByTime(5000)
    expect(titles()).toEqual(['A'])
    holdAlert(false)
    vi.advanceTimersByTime(1000)
    expect(titles()).toEqual([null])
  })

  it('closing brings the next one right away', () => {
    showAlert({ kind: 'notice', label: 'Aviso', title: 'A' })
    showAlert({ kind: 'notice', label: 'Aviso', title: 'B' })
    dismissAlert()
    expect(titles()).toEqual(['B'])
  })
})
