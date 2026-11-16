import { describe, expect, it } from 'vitest'
import { DEFAULT_APPEARANCE } from './ipc'
import { dropPillItem, movePillItem, pickPillItem } from './pillPriority'

const show = DEFAULT_APPEARANCE.pillShow

describe('pickPillItem', () => {
  it('follows the priority among active items', () => {
    expect(pickPillItem(['music', 'timer'], show, ['timer', 'event', 'music'])).toBe('timer')
    expect(pickPillItem(['music', 'timer'], show, ['music', 'timer', 'event'])).toBe('music')
    expect(pickPillItem([], show, ['timer', 'event', 'music'])).toBeNull()
  })

  it('skips items hidden in the pill', () => {
    const noTimer = { ...show, timer: false }
    expect(pickPillItem(['timer', 'music'], noTimer, ['timer', 'event', 'music'])).toBe('music')
  })
})

describe('reordering', () => {
  it('moves one step and stays in bounds', () => {
    expect(movePillItem(['timer', 'event', 'music'], 'music', -1)).toEqual([
      'timer',
      'music',
      'event',
    ])
    expect(movePillItem(['timer', 'event', 'music'], 'timer', -1)).toEqual([
      'timer',
      'event',
      'music',
    ])
  })

  it('drops onto a target slot', () => {
    expect(dropPillItem(['timer', 'event', 'music'], 'music', 'timer')).toEqual([
      'music',
      'timer',
      'event',
    ])
    expect(dropPillItem(['timer', 'event', 'music'], 'timer', 'music')).toEqual([
      'event',
      'music',
      'timer',
    ])
  })
})
