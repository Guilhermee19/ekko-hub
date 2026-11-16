import { describe, expect, it } from 'vitest'
import { advance, isBlocked } from './flow'

describe('onboarding flow', () => {
  it('walks every step and finishes on the last one', () => {
    const total = 6
    let index = 0
    const seen: number[] = []
    for (;;) {
      const a = advance(index, total, false)
      if (a.kind === 'finish') break
      if (a.kind !== 'next') throw new Error('stuck')
      index = a.index
      seen.push(index)
    }
    expect(seen).toEqual([1, 2, 3, 4, 5])
    expect(advance(5, total, false)).toEqual({ kind: 'finish' })
  })

  it('only the name step can block, and only with an empty name', () => {
    expect(isBlocked('names', '  ')).toBe(true)
    expect(isBlocked('names', 'Guilherme')).toBe(false)
    expect(isBlocked('voice', '')).toBe(false)
    expect(advance(1, 6, true)).toEqual({ kind: 'stay' })
  })

  it('the last step never blocks finishing', () => {
    expect(advance(5, 6, isBlocked('done', ''))).toEqual({ kind: 'finish' })
  })
})
