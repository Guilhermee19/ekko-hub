import { APPEARANCE_LIMITS as L } from '@/lib/ipc'
import { Field } from '../Field'
import { NotchSettingsPanel } from '../NotchSettingsPanel'
import { Group, percent, setAppearance, SliderRow, ToggleRow, useAppearance } from './controls'
import { PillPreview } from './PillPreview'

/** Notch placement/behavior (existing panel) plus the pill's look, with a live preview. */
export function NotchLookGroup() {
  const look = useAppearance()
  return (
    <Group title="Notch" hint="Onde ele fica, como abre e o visual da pílula fechada.">
      <NotchSettingsPanel />

      <Field title="Visual da pílula" hint="Mudou aqui, mudou no notch de verdade na hora.">
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
              label="Brilho"
              value={look.notchGlow}
              min={L.notchGlow[0]}
              max={L.notchGlow[1]}
              step={0.05}
              format={percent}
              onChange={(notchGlow) => setAppearance({ notchGlow })}
            />
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
          <div className="max-w-md">
            <ToggleRow
              label="Borda colorida"
              hint="Contorno no tom do destaque; a intensidade segue o brilho."
              checked={look.notchBorder}
              onChange={(notchBorder) => setAppearance({ notchBorder })}
            />
          </div>
        </div>
      </Field>
    </Group>
  )
}
