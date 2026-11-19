import { MEDIA_CHANGED, VOLUME_CHANGED, type NowPlaying, type VolumeState } from './mediaTypes'
import type { Backend, Unlisten } from './types'

// Fake "now playing" for the browser gallery: a few tracks across sources.

type MediaMethods = Pick<
  Backend,
  | 'mediaNow'
  | 'onMediaChanged'
  | 'mediaPlayPause'
  | 'mediaNext'
  | 'mediaPrevious'
  | 'mediaSeek'
  | 'volumeGet'
  | 'volumeSet'
  | 'volumeStep'
  | 'volumeMute'
  | 'onVolumeChanged'
  | 'onAudioLevels'
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
    canSeek: true,
    thumbnail: null,
  },
  {
    title: 'Lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    album: '',
    appId: 'chrome',
    source: 'Chrome',
    durationMs: 0,
    canSeek: false,
    thumbnail: null,
  },
  {
    title: 'Tempo Perdido',
    artist: 'Legião Urbana',
    album: 'Dois',
    appId: 'Chrome._crx_cinhimbnkkaeohfgghhklpknlkffjgod',
    source: 'YouTube Music',
    durationMs: 301_000,
    canSeek: true,
    thumbnail: null,
  },
]

export function mockMedia({ on, fire }: Deps): MediaMethods {
  let index = 0
  let playing = true
  // Position is stored as "where it was at `since`" so no ticker is needed here.
  let base = 83_000
  let since = Date.now()
  let volume: VolumeState = { level: 0.6, muted: false }

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

  const setVolume = (next: VolumeState) => {
    volume = { ...next, level: Math.min(1, Math.max(0, next.level)) }
    fire(VOLUME_CHANGED, volume)
    return Promise.resolve(volume)
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
    mediaSeek: (positionMs) => {
      base = positionMs
      since = Date.now()
      return changed()
    },
    volumeGet: () => Promise.resolve(volume),
    volumeSet: (level) => setVolume({ level, muted: level > 0 ? false : volume.muted }),
    volumeStep: (delta) =>
      setVolume({ level: Math.round((volume.level + delta) * 100) / 100, muted: false }),
    volumeMute: (on) => setVolume({ ...volume, muted: on }),
    onVolumeChanged: (cb) => on(VOLUME_CHANGED, (p) => cb(p as VolumeState)),
    // The gallery has no audio: a steady fake beat (120 bpm) while "playing".
    onAudioLevels: (cb) => {
      const tick = window.setInterval(() => {
        const t = Date.now() / 1000
        const beat = Math.exp(-((t * 2) % 1) * 5)
        cb(playing ? [beat, 0.3 + 0.3 * Math.sin(t * 3), 0.5 * beat + 0.2, 0.25] : [0, 0, 0, 0])
      }, 33)
      return Promise.resolve(() => window.clearInterval(tick))
    },
  }
}
