import { MEDIA_CHANGED, type NowPlaying } from './mediaTypes'
import type { Backend, Unlisten } from './types'

// Fake "now playing" for the browser gallery: a few tracks across sources.

type MediaMethods = Pick<
  Backend,
  'mediaNow' | 'onMediaChanged' | 'mediaPlayPause' | 'mediaNext' | 'mediaPrevious'
>

interface Deps {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
}

const FAKE: Omit<NowPlaying, 'playing' | 'positionMs'>[] = [
  {
    title: 'Do I Wanna Know?',
    artist: 'Arctic Monkeys',
    album: 'AM',
    appId: 'Spotify.exe',
    source: 'Spotify',
    durationMs: 272_000,
    thumbnail: null,
  },
  {
    title: 'Lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    album: '',
    appId: 'chrome',
    source: 'Chrome',
    durationMs: 0,
    thumbnail: null,
  },
  {
    title: 'Tempo Perdido',
    artist: 'Legião Urbana',
    album: 'Dois',
    appId: 'Chrome._crx_cinhimbnkkaeohfgghhklpknlkffjgod',
    source: 'YouTube Music',
    durationMs: 301_000,
    thumbnail: null,
  },
]

export function mockMedia({ on, fire }: Deps): MediaMethods {
  let index = 0
  let playing = true
  // Position is stored as "where it was at `since`" so no ticker is needed here.
  let base = 83_000
  let since = Date.now()

  const now = (): NowPlaying => {
    const raw = base + (playing ? Date.now() - since : 0)
    const track = FAKE[index]
    const positionMs = track.durationMs > 0 ? Math.min(track.durationMs, raw) : raw
    return { ...track, playing, positionMs }
  }
  const changed = () => {
    fire(MEDIA_CHANGED, now())
    return Promise.resolve()
  }
  const jump = (step: number) => {
    index = (index + step + FAKE.length) % FAKE.length
    base = 0
    since = Date.now()
    return changed()
  }

  return {
    mediaNow: () => Promise.resolve(now()),
    onMediaChanged: (cb) => on(MEDIA_CHANGED, (p) => cb(p as NowPlaying | null)),
    mediaPlayPause: () => {
      base = now().positionMs
      since = Date.now()
      playing = !playing
      return changed()
    },
    mediaNext: () => jump(1),
    mediaPrevious: () => jump(-1),
  }
}
