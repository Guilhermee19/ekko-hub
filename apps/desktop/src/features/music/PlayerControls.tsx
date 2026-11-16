import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useSpotify } from '@/features/spotify/store'
import type { SpotifyRepeat } from '@/lib/ipc'
import { IconButton, Slider } from '@/ui/primitives'
import { NEXT_REPEAT } from './nowPlaying'
import { useMusic } from './store'
import { setVolume, toggleMute, useVolume } from './volume'

const REPEAT_LABEL: Record<SpotifyRepeat, string> = {
  off: 'Repetir: desligado',
  context: 'Repetir: fila',
  track: 'Repetir: faixa',
}

/** Play/pause/skip for any player; shuffle and repeat only when Spotify is the player. */
export function TransportControls() {
  const { playing, toggle, next, prev, viaSpotify } = useMusic()
  return (
    <div className="flex items-center justify-between gap-1">
      {viaSpotify ? <ShuffleButton /> : <span aria-hidden className="size-9" />}
      <IconButton label="Anterior" onClick={prev}>
        <SkipBack className="size-4.5" />
      </IconButton>
      <IconButton
        label={playing ? 'Pausar' : 'Tocar'}
        tone="accent"
        className="size-11"
        onClick={toggle}
      >
        {playing ? <Pause className="size-5" /> : <Play className="size-5 translate-x-px" />}
      </IconButton>
      <IconButton label="Próxima" onClick={next}>
        <SkipForward className="size-4.5" />
      </IconButton>
      {viaSpotify ? <RepeatButton /> : <span aria-hidden className="size-9" />}
    </div>
  )
}

function ShuffleButton() {
  const shuffle = useSpotify((s) => s.playback?.shuffle ?? false)
  const setShuffle = useSpotify((s) => s.setShuffle)
  return (
    <IconButton
      label="Aleatório"
      active={shuffle}
      aria-pressed={shuffle}
      onClick={() => void setShuffle(!shuffle)}
    >
      <Shuffle className="size-4" />
    </IconButton>
  )
}

function RepeatButton() {
  const repeat = useSpotify((s) => s.playback?.repeat ?? 'off')
  const setRepeat = useSpotify((s) => s.setRepeat)
  const Icon = repeat === 'track' ? Repeat1 : Repeat
  return (
    <IconButton
      label={REPEAT_LABEL[repeat]}
      active={repeat !== 'off'}
      onClick={() => void setRepeat(NEXT_REPEAT[repeat])}
    >
      <Icon className="size-4" />
    </IconButton>
  )
}

/** Spotify's device volume when Spotify is the player; the Windows volume otherwise. */
export function VolumeControl() {
  const { level, muted, target } = useVolume()
  const silent = muted || level === 0
  const Icon = silent ? VolumeX : level < 0.5 ? Volume1 : Volume2
  const where = target === 'spotify' ? 'Volume do Spotify' : 'Volume do Windows'
  return (
    <div className="flex items-center gap-2">
      <IconButton label={silent ? 'Ativar som' : 'Silenciar'} onClick={toggleMute}>
        <Icon className="size-4" />
      </IconButton>
      <Slider
        label={where}
        value={Math.round(level * 100)}
        min={0}
        max={100}
        onChange={(v) => setVolume(v / 100)}
      />
      <span title={where} className="w-9 text-right font-mono text-[11px] text-muted tabular-nums">
        {Math.round(level * 100)}%
      </span>
    </div>
  )
}
