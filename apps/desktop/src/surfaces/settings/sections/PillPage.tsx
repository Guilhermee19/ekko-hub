import { Field } from '../Field'
import { PillFields } from '../appearance/PillFields'
import { PillPreview } from '../appearance/PillPreview'
import { AlertTimeField } from '../NotchFields'
import { PageFrame } from './GeneralControls'

/** What the closed notch shows: parts, live activities, their order and quick alerts. */
export function PillPage() {
  return (
    <PageFrame
      title="Pílula e avisos"
      subtitle="O que aparece no notch fechado: timers, música, eventos, bateria e os avisos do sistema."
    >
      <Field title="Prévia" hint="Mudou aqui, mudou no notch de verdade na hora.">
        <PillPreview />
      </Field>
      <PillFields />
      <AlertTimeField />
    </PageFrame>
  )
}
