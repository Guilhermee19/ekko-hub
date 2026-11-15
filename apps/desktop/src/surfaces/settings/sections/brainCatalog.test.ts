import { describe, expect, it } from 'vitest'
import { maskKey, PROVIDERS } from './brainCatalog'

describe('maskKey', () => {
  it('keeps the provider prefix and the last 4 characters', () => {
    expect(maskKey('sk-ant-api03-abcdefgh1234', 'sk-ant-')).toBe('sk-ant-••••••1234')
    expect(maskKey('  AIzaSyXXXXXX9876 ', 'AIza')).toBe('AIza••••••9876')
  })

  it('falls back to 3 chars when the prefix does not match', () => {
    expect(maskKey('abcdefghijkl', 'sk-')).toBe('abc••••••ijkl')
  })

  it('fully hides short or empty keys', () => {
    expect(maskKey('')).toBe('')
    expect(maskKey('12345')).toBe('•••••')
  })

  it('has a mock model list for every provider', () => {
    for (const p of PROVIDERS) expect(p.models.length).toBeGreaterThan(1)
  })
})
