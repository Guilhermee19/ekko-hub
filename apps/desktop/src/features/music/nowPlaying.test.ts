import { describe, expect, it } from 'vitest'
import type { NowPlaying } from '@/lib/ipc'
import {
  fromSpotify,
  isSpotify,
  NEXT_REPEAT,
  positionAt,
  SPOTIFY_REMOTE,
  toTrack,
  volumeTarget,
} from './nowPlaying'

const NOW: NowPlaying = {
  title: 'Do I Wanna Know?',
  artist: 'Arctic Monkeys',
  album: 'AM',
  appId: 'Spotify.exe',
  source: 'Spotify',
  playing: true,
  positionMs: 83_000,
  durationMs: 272_400,
  canSeek: true,
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

describe('Spotify routing', () => {
  const playback = {
    playing: true,
    progressMs: 5_000,
    shuffle: false,
    repeat: 'off' as const,
    device: { id: 'p', name: 'Celular', kind: 'smartphone', active: true, volume: 40 },
    track: { id: 't', title: 'Song', artist: 'A', album: 'Al', durationMs: 9_000, coverUrl: null },
  }

  it('maps remote playback and recognizes Spotify players', () => {
    const now = fromSpotify(playback)
    expect(now).toMatchObject({ appId: SPOTIFY_REMOTE, source: 'Spotify (Celular)', canSeek: true })
    expect(fromSpotify({ ...playback, track: null })).toBeNull()
    expect(isSpotify(now)).toBe(true)
    expect(isSpotify(NOW)).toBe(true)
    expect(isSpotify({ ...NOW, source: 'Chrome' })).toBe(false)
    expect(isSpotify(null)).toBe(false)
  })

  it('uses Spotify volume only when Spotify may be the player', () => {
    expect(volumeTarget(true, 'spotify', 40)).toBe('spotify')
    expect(volumeTarget(true, 'none', 40)).toBe('spotify')
    expect(volumeTarget(true, 'other', 40)).toBe('windows')
    expect(volumeTarget(true, 'spotify', null)).toBe('windows')
    expect(volumeTarget(false, 'spotify', 40)).toBe('windows')
  })

  it('cycles repeat off → context → track → off', () => {
    expect(NEXT_REPEAT.off).toBe('context')
    expect(NEXT_REPEAT.context).toBe('track')
    expect(NEXT_REPEAT.track).toBe('off')
  })
})
