import { APPEARANCE_LIMITS as L } from '@/lib/ipc'
import { Segmented } from '@/ui/primitives'
import { Field } from '../Field'
import { percent, setAppearance, SliderRow, useAppearance } from './controls'
import { PillPreview } from './PillPreview'

/** The closed notch's look (shape, glow, outline, size), with a live preview. */
export function NotchLookField() {
  const look = useAppearance()
  return (
    <Field
      title="Visual"
      hint="Mudou aqui, mudou no notch de verdade na hora. O contorno ajuda a ver onde o notch começa e termina."
    >
      <div className="flex flex-col gap-4">
        <PillPreview />
        <div className="flex flex-col gap-2.5">
          <SliderRow
            label="Arredondamento"
            value={look.notchRadius}
            min={L.notchRadius[0]}
            max={L.notchRadius[1]}
            step={1}
            format={(v) => `${v} px`}
            onChange={(notchRadius) => setAppearance({ notchRadius })}
          />
          <SliderRow
            label="Opacidade"
            value={look.notchOpacity}
            min={L.notchOpacity[0]}
            max={L.notchOpacity[1]}
            step={0.02}
            format={percent}
            onChange={(notchOpacity) => setAppearance({ notchOpacity })}
          />
          <SliderRow
            label="Brilho de baixo"
            value={look.notchGlow}
            min={L.notchGlow[0]}
            max={L.notchGlow[1]}
            step={0.05}
            format={percent}
            onChange={(notchGlow) => setAppearance({ notchGlow })}
          />
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
            <span className="w-28 shrink-0">Contorno</span>
            <Segmented
              value={look.notchOutline}
              options={[
                { value: 'none', label: 'Nenhum' },
                { value: 'line', label: 'Linha' },
                { value: 'glow', label: 'Brilho' },
                { value: 'shadow', label: 'Sombra' },
              ]}
              onChange={(notchOutline) => setAppearance({ notchOutline })}
            />
          </div>
          {look.notchOutline !== 'none' && (
            <SliderRow
              label="Força do contorno"
              value={look.notchOutlineStrength}
              min={L.notchOutlineStrength[0]}
              max={L.notchOutlineStrength[1]}
              step={0.05}
              format={percent}
              onChange={(notchOutlineStrength) => setAppearance({ notchOutlineStrength })}
            />
          )}
          <SliderRow
            label="Tamanho"
            value={look.notchScale}
            min={L.notchScale[0]}
            max={L.notchScale[1]}
            step={0.05}
            format={percent}
            onChange={(notchScale) => setAppearance({ notchScale })}
          />
        </div>
      </div>
    </Field>
  )
}
