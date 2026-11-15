import { describe, expect, it } from 'vitest'
import { formatLastRun, moveItem, triggerLabel } from './model'

describe('routine model', () => {
  it('labels each trigger kind', () => {
    expect(triggerLabel({ kind: 'time', time: '07:30', days: 'weekdays' })).toBe('07:30 · seg–sex')
    expect(triggerLabel({ kind: 'phrase', phrase: ' bom dia ' })).toBe('“bom dia”')
    expect(triggerLabel({ kind: 'phrase', phrase: '' })).toBe('Frase não definida')
    expect(triggerLabel({ kind: 'event', event: 'pc-on' })).toBe('ao ligar o PC')
  })

  it('moves items and clamps the target', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveItem(['a', 'b', 'c'], 2, 9)).toEqual(['a', 'b', 'c'])
    const same = ['a']
    expect(moveItem(same, 0, -1)).toBe(same)
  })

  it('formats the last run relative to today', () => {
    const now = new Date(2026, 10, 15, 12, 0).getTime()
    expect(formatLastRun(null, now)).toBe('Nunca rodou')
    expect(formatLastRun(new Date(2026, 10, 15, 7, 30).getTime(), now)).toBe('hoje às 07:30')
    expect(formatLastRun(new Date(2026, 10, 14, 22, 5).getTime(), now)).toBe('ontem às 22:05')
    expect(formatLastRun(new Date(2026, 10, 2, 8, 0).getTime(), now)).toBe('02/11 às 08:00')
  })
})
