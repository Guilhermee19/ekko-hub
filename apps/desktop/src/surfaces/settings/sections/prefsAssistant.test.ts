import { describe, expect, it } from 'vitest'
import { anyDownloading, downloadProgress } from './prefsAssistant'

describe('mock download progress', () => {
  it('is null until started, then clamps to 0..1', () => {
    expect(downloadProgress(undefined, 1000)).toBeNull()
    const d = { startedAt: 1000, ms: 500, done: false }
    expect(downloadProgress(d, 1250)).toBe(0.5)
    expect(downloadProgress(d, 9000)).toBe(1)
    expect(downloadProgress(d, 900)).toBe(0)
    expect(downloadProgress({ ...d, done: true }, 1000)).toBe(1)
  })

  it('knows when something is still downloading', () => {
    expect(anyDownloading({})).toBe(false)
    expect(anyDownloading({ a: { startedAt: 0, ms: 1, done: true } })).toBe(false)
    expect(anyDownloading({ a: { startedAt: 0, ms: 1, done: false } })).toBe(true)
  })
})
