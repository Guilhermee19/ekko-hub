import { APPEARANCE_LIMITS as L, type ReduceMotion, type SurfaceTone } from '@/lib/ipc'
import { Segmented } from '@/ui/primitives'
import { Field } from '../Field'
import { Group, percent, setAppearance, SliderRow, useAppearance } from './controls'

/** Text scale, surface tone and motion for the full windows (central, painel, config). */
export function PanelGroup() {
  const look = useAppearance()
  return (
    <Group title="Painel" hint="Janelas grandes: central, painel e estas configurações.">
      <Field title="Tamanho da interface" hint="Texto, ícones e espaçamentos crescem juntos.">
        <SliderRow
          label="Escala"
          value={look.fontScale}
          min={L.fontScale[0]}
          max={L.fontScale[1]}
          step={0.05}
          format={percent}
          onChange={(fontScale) => setAppearance({ fontScale })}
        />
      </Field>

      <Field
        title="Tom das superfícies"
        hint="Fundo e cartões: como a persona, mais escuro ou tingido."
      >
        <Segmented<SurfaceTone>
          value={look.surfaceTone}
          options={[
            { value: 'default', label: 'Padrão' },
            { value: 'darker', label: 'Mais escuro' },
            { value: 'tinted', label: 'Tingido' },
          ]}
          onChange={(surfaceTone) => setAppearance({ surfaceTone })}
        />
      </Field>

      <Field
        title="Reduzir movimento"
        hint="Desliga giros, respiração e entradas animadas. O brilho do núcleo continua."
      >
        <Segmented<ReduceMotion>
          value={look.reduceMotion}
          options={[
            { value: 'system', label: 'Seguir o Windows' },
            { value: 'on', label: 'Sempre' },
            { value: 'off', label: 'Nunca' },
          ]}
          onChange={(reduceMotion) => setAppearance({ reduceMotion })}
        />
      </Field>
    </Group>
  )
}
