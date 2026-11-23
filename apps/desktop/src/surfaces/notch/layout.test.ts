import { describe, expect, it } from 'vitest'
import { IDLE } from '@/stores/assistant'
import type { NotchSize } from '@/lib/ipc'
import { formatRemaining } from '@/lib/time'
import { ALERT, canvas, notchBox, notchLook, pillWidth, showsMusic } from './layout'

describe('notch layout', () => {
  it('song buttons only count while the pill shows the song', () => {
    const music = { kind: 'music' as const, title: 'a', artist: 'b', playing: true }
    expect(showsMusic({ ...IDLE, activity: music })).toBe(true)
    expect(showsMusic(IDLE)).toBe(false)
    expect(showsMusic({ ...IDLE, activity: music, toast: 'oi' })).toBe(false)
    expect(showsMusic({ ...IDLE, activity: music, phase: 'listening' })).toBe(false)
  })

  it('idle pill is the narrowest state', () => {
    const states = [
      { ...IDLE, phase: 'listening' as const },
      { ...IDLE, toast: 'oi' },
      { ...IDLE, activity: { kind: 'volume' as const, level: 0.5 } },
    ]
    for (const s of states) expect(pillWidth(s)).toBeGreaterThan(pillWidth(IDLE))
  })

  it('box is top-centered and fits the canvas for every size', () => {
    const sizes: NotchSize[] = ['compact', 'normal', 'large']
    for (const size of sizes) {
      for (const look of ['panel', 'pill', 'line', 'drop', 'print'] as const) {
        const b = notchBox(look, size, IDLE)
        expect(b.y).toBe(0)
        expect(b.x * 2 + b.w).toBe(canvas(size).w)
        expect(b.h).toBeLessThanOrEqual(canvas(size).h)
      }
    }
  })

  it('box follows the anchor but stays inside the canvas', () => {
    const cw = canvas('normal').w
    expect(notchBox('pill', 'normal', IDLE, 100).x).toBe(100 - 75)
    expect(notchBox('pill', 'normal', IDLE, 10).x).toBe(0)
    const panel = notchBox('panel', 'normal', IDLE, 10)
    expect(panel.x).toBe(0)
    expect(notchBox('panel', 'normal', IDLE, cw).x + panel.w).toBe(cw)
  })

  it('minimal idle shrinks to a line only when there is nothing to show', () => {
    expect(notchLook(false, 'minimal', IDLE)).toBe('line')
    expect(notchLook(false, 'minimal', { ...IDLE, toast: 'oi' })).toBe('pill')
    expect(notchLook(true, 'minimal', IDLE)).toBe('panel')
    expect(notchLook(false, 'pill', IDLE)).toBe('pill')
  })

  it('files dragged over the notch show the drop zone, even when open', () => {
    expect(notchLook(false, 'minimal', IDLE, true)).toBe('drop')
    expect(notchLook(true, 'pill', IDLE, true)).toBe('drop')
  })

  it('a fresh print shows its card over the panel, but not over a file drop', () => {
    expect(notchLook(true, 'pill', IDLE, false, true)).toBe('print')
    expect(notchLook(false, 'pill', IDLE, true, true)).toBe('drop')
  })

  it('an alert grows the closed notch into its card; the open panel keeps it waiting', () => {
    expect(notchLook(false, 'minimal', IDLE, false, false, true)).toBe('alert')
    expect(notchLook(true, 'pill', IDLE, false, false, true)).toBe('panel')
    expect(notchLook(false, 'pill', IDLE, false, true, true)).toBe('print')
    const box = notchBox('alert', 'normal', IDLE)
    expect([box.w, box.h]).toEqual([ALERT.w, ALERT.h])
  })

  it('formats countdown and never goes negative', () => {
    expect(formatRemaining(290_000)).toBe('04:50')
    expect(formatRemaining(-5)).toBe('00:00')
    expect(formatRemaining(1)).toBe('00:01')
  })
})
