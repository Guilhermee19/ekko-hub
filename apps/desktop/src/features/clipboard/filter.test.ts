import { describe, expect, it } from 'vitest'
import { matches, sortClips } from './filter'
import type { Clip } from './store'

const clip = (id: string, at: number, pinned = false): Clip => ({
  id,
  kind: 'text',
  content: id,
  source: 'x',
  at,
  pinned,
})

describe('clipboard filter', () => {
  it('puts pinned items first, newest first within each group', () => {
    const ids = sortClips([clip('a', 1), clip('b', 3), clip('c', 2, true), clip('d', 0, true)]).map(
      (c) => c.id,
    )
    expect(ids).toEqual(['c', 'd', 'b', 'a'])
  })

  it('matches case-insensitively across fields', () => {
    expect(matches('', 'qualquer')).toBe(true)
    expect(matches('  PIX ', 'Chave Pix: 123')).toBe(true)
    expect(matches('figma', 'link', 'Figma')).toBe(true)
    expect(matches('nada', 'abc', 'def')).toBe(false)
  })
})
