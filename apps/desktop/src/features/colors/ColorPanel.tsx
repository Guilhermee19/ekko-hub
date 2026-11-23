import { useState } from 'react'
import { cn } from '@/lib/cn'
import { parseHex } from '@/theme/color'
import { Segmented, Slider } from '@/ui/primitives'
import { GRID_COLUMNS, gridRows, withChannel } from './palette'
import { SpectrumPicker } from './SpectrumPicker'

type View = 'grid' | 'spectrum' | 'sliders'

const VIEWS: { value: View; label: string }[] = [
  { value: 'grid', label: 'Grade' },
  { value: 'spectrum', label: 'Espectro' },
  { value: 'sliders', label: 'Controles' },
]

interface Props {
  value: string
  onChange: (hex: string) => void
}

/** Choose a color three ways, like design tools: a swatch grid, the spectrum or RGB. */
export function ColorPanel({ value, onChange }: Props) {
  const [view, setView] = useState<View>('grid')
  return (
    <div className="flex flex-col gap-3">
      <Segmented value={view} options={VIEWS} onChange={setView} />
      {view === 'grid' && <Grid value={value} onChange={onChange} />}
      {view === 'spectrum' && <SpectrumPicker value={value} onChange={onChange} />}
      {view === 'sliders' && <Sliders value={value} onChange={onChange} />}
    </div>
  )
}

/** The grid never changes: built once. */
const GRID = gridRows().flat()

function Grid({ value, onChange }: Props) {
  return (
    <div
      role="listbox"
      aria-label="Grade de cores"
      className="grid overflow-hidden rounded-lg border border-border-soft"
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
    >
      {GRID.map((hex, i) => (
        <button
          key={`${i}-${hex}`}
          type="button"
          role="option"
          aria-selected={hex === value}
          aria-label={hex.toUpperCase()}
          title={hex.toUpperCase()}
          onClick={() => onChange(hex)}
          className={cn(
            'aspect-square transition-transform focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-accent',
            hex === value && 'z-10 scale-110 rounded-sm shadow-md ring-2 ring-white',
          )}
          style={{ background: hex }}
        />
      ))}
    </div>
  )
}

const CHANNELS = [
  { label: 'Vermelho', short: 'R' },
  { label: 'Verde', short: 'G' },
  { label: 'Azul', short: 'B' },
] as const

/** RGB sliders; typing a code lives in CodeInput, next to the current color. */
function Sliders({ value, onChange }: Props) {
  const rgb = parseHex(value) ?? [0, 0, 0]
  return (
    <div className="flex flex-col gap-2.5">
      {CHANNELS.map((c, i) => (
        <div key={c.short} className="flex items-center gap-3">
          <span className="w-4 font-mono text-[11px] text-muted">{c.short}</span>
          <Slider
            label={c.label}
            value={rgb[i]}
            min={0}
            max={255}
            onChange={(v) => onChange(withChannel(value, i as 0 | 1 | 2, v))}
          />
          <span className="w-8 text-right font-mono text-[11px] text-muted tabular-nums">
            {rgb[i]}
          </span>
        </div>
      ))}
    </div>
  )
}
