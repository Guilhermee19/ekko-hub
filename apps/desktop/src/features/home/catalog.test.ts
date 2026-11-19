import { describe, expect, it } from 'vitest'
import { cardWidth, DEFAULT_HOME, HOME_CARDS, homeLayout, missingCards, spanClass } from './catalog'

describe('home cards', () => {
  it('uses the default set until the user changes it', () => {
    expect(homeLayout(null)).toEqual(DEFAULT_HOME)
  })

  it('keeps the saved order, dropping unknown ids and repeats', () => {
    expect(homeLayout(['pc', 'nope', 'water', 'pc'])).toEqual(['pc', 'water'])
  })

  it('an empty list stays empty (the user removed everything)', () => {
    expect(homeLayout([])).toEqual([])
    expect(missingCards([])).toHaveLength(HOME_CARDS.length)
  })

  it('widths follow the 4-column grid', () => {
    expect(cardWidth('water', {})).toBe(1)
    expect(cardWidth('music', {})).toBe(2)
    expect(cardWidth('music', { music: 9 })).toBe(4)
    expect(cardWidth('pc', { pc: 0 })).toBe(1)
    expect(spanClass(3, false)).toBe('col-span-2 @lg:col-span-3')
    // The narrow panel has 2 columns: wide cards take the row, never more.
    expect(spanClass(4, true)).toBe('col-span-2')
    expect(spanClass(1, true)).toBe('col-span-1')
  })

  it('offers only the cards that are not on the home', () => {
    const ids = missingCards(DEFAULT_HOME).map((c) => c.id)
    expect(ids).toEqual(['agenda', 'pc', 'battery', 'clipboard', 'shelf'])
  })
})
