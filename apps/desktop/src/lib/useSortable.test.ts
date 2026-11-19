import { describe, expect, it } from 'vitest'
import { moveTo } from './useSortable'

describe('moveTo', () => {
  it('moves an item down or up into the target slot', () => {
    expect(moveTo(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveTo(['a', 'b', 'c', 'd'], 'd', 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('keeps the list when the slot is its own', () => {
    expect(moveTo(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'b', 'c'])
  })
})
