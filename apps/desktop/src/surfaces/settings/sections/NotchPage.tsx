import { NotchLookField } from '../appearance/NotchLookField'
import { NotchIdleField, NotchOpenField, NotchPositionField, NotchSizeField } from '../NotchFields'
import { PageFrame } from './GeneralControls'

/** The notch itself: where it sits, how it opens and how it looks closed. */
export function NotchPage() {
  return (
    <PageFrame
      title="Notch"
      subtitle="Onde ele fica no topo da tela, como abre e como é o visual dele fechado."
    >
      <NotchPositionField />
      <NotchOpenField />
      <NotchSizeField />
      <NotchIdleField />
      <NotchLookField />
    </PageFrame>
  )
}
