import { describe, expect, it } from 'vitest'
import { formatWhen, groupByDay } from './group'
import type { Notification } from './store'

const now = new Date(2026, 10, 15, 16, 0).getTime()
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const n = (id: string, time: number): Notification => ({
  id,
  kind: 'system',
  title: id,
  body: '',
  at: time,
  read: false,
})

describe('notification grouping', () => {
  it('splits today from before, newest first', () => {
    const groups = groupByDay([n('a', at(14, 9)), n('b', at(15, 8)), n('c', at(15, 15))], now)
    expect(groups.map((g) => g.label)).toEqual(['Hoje', 'Antes'])
    expect(groups[0].items.map((x) => x.id)).toEqual(['c', 'b'])
    expect(groups[1].items.map((x) => x.id)).toEqual(['a'])
  })

  it('drops empty groups', () => {
    expect(groupByDay([n('a', at(15, 1))], now).map((g) => g.label)).toEqual(['Hoje'])
    expect(groupByDay([], now)).toEqual([])
  })

  it('formats relative days', () => {
    expect(formatWhen(at(15, 9, 5), now)).toBe('09:05')
    expect(formatWhen(at(14, 9, 5), now)).toBe('ontem 09:05')
    expect(formatWhen(at(12, 9, 5), now)).toBe('12/11 09:05')
  })
})
