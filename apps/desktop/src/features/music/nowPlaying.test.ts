import { describe, expect, it } from 'vitest'
import type { NowPlaying } from '@/lib/ipc'
import { positionAt, toTrack } from './nowPlaying'

const NOW: NowPlaying = {
  title: 'Do I Wanna Know?',
  artist: 'Arctic Monkeys',
  album: 'AM',
  appId: 'Spotify.exe',
  source: 'Spotify',
  playing: true,
  positionMs: 83_000,
  durationMs: 272_400,
  thumbnail: null,
}

describe('toTrack', () => {
  it('maps fields and rounds the duration', () => {
    const t = toTrack(NOW)
    expect(t).toMatchObject({ title: NOW.title, artist: NOW.artist, album: 'AM', durationSec: 272 })
  })

  it('uses the thumbnail as cover, or a stable gradient', () => {
    expect(toTrack({ ...NOW, thumbnail: 'data:image/png;base64,AA' }).cover).toBe(
      'url("data:image/png;base64,AA") center/cover',
    )
    expect(toTrack(NOW).cover).toMatch(/gradient/)
    expect(toTrack(NOW).cover).toBe(toTrack(NOW).cover)
  })
})

describe('positionAt', () => {
  it('advances only while playing and stops at the end', () => {
    expect(positionAt(NOW, 2_000)).toBe(85)
    expect(positionAt({ ...NOW, playing: false }, 2_000)).toBe(83)
    expect(positionAt(NOW, 10_000_000)).toBe(272.4)
  })

  it('keeps counting on streams without a duration', () => {
    expect(positionAt({ ...NOW, durationMs: 0 }, 1_000)).toBe(84)
  })
})
