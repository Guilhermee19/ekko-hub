import { backend } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Segmented } from '@/ui/primitives'
import { DisplayModePicker } from '../DisplayModePicker'
import { Field } from '../Field'
import { MonitorField } from '../NotchFields'
import { PageFrame } from './GeneralControls'

/** Where Ekko lives on the screen: the mode, the monitor and the dock side. */
export function DisplayPage() {
  const dockSide = useSettings((s) => s.settings.dockSide)
  return (
    <PageFrame
      title="Modo de exibição"
      subtitle="Onde o Ekko fica na sua tela. Dá para trocar a qualquer momento, sem reiniciar."
    >
      <Field title="Modo" hint="Como ele aparece: no topo, na barra de tarefas, perto do relógio, flutuando ou de lado.">
        <DisplayModePicker />
      </Field>
      <MonitorField />
      <Field title="Lado do dock" hint="Usado no modo Dock lateral.">
        <Segmented
          value={dockSide}
          options={[
            { value: 'left', label: 'Esquerda' },
            { value: 'right', label: 'Direita' },
          ]}
          onChange={(side) => void backend.setDockSide(side)}
        />
      </Field>
    </PageFrame>
  )
}
