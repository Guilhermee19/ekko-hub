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
import { IconButton, Slider } from '@/ui/primitives'
import { useMusic } from './store'

const REPEAT_LABEL = {
  off: 'Repetir: desligado',
  all: 'Repetir: fila',
  one: 'Repetir: faixa',
} as const

export function TransportControls() {
  const { playing, shuffle, repeat, toggle, next, prev, toggleShuffle, cycleRepeat } = useMusic()
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat
  return (
    <div className="flex items-center justify-between gap-1">
      <IconButton label="Aleatório" active={shuffle} aria-pressed={shuffle} onClick={toggleShuffle}>
        <Shuffle className="size-4" />
      </IconButton>
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
      <IconButton label={REPEAT_LABEL[repeat]} active={repeat !== 'off'} onClick={cycleRepeat}>
        <RepeatIcon className="size-4" />
      </IconButton>
    </div>
  )
}

export function VolumeControl() {
  const volume = useMusic((s) => s.volume)
  const setVolume = useMusic((s) => s.setVolume)
  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  return (
    <div className="flex items-center gap-2">
      <IconButton
        label={volume === 0 ? 'Ativar som' : 'Silenciar'}
        onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
      >
        <Icon className="size-4" />
      </IconButton>
      <Slider
        label="Volume"
        value={Math.round(volume * 100)}
        min={0}
        max={100}
        onChange={(v) => setVolume(v / 100)}
      />
      <span className="w-9 text-right font-mono text-[11px] text-muted tabular-nums">
        {Math.round(volume * 100)}%
      </span>
    </div>
  )
}
