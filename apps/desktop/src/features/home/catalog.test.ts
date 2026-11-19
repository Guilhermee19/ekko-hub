import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME, HOME_CARDS, homeLayout, missingCards } from './catalog'

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

  it('offers only the cards that are not on the home', () => {
    const ids = missingCards(DEFAULT_HOME).map((c) => c.id)
    expect(ids).toEqual(['agenda', 'pc', 'clipboard', 'shelf'])
  })
})
