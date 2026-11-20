import { MenuFields } from '../appearance/MenuFields'
import { PageFrame } from './GeneralControls'

/** The panel's pages (sidebar of the notch, dock and central). */
export function MenuPage() {
  return (
    <PageFrame
      title="Menu do painel"
      subtitle="As páginas na lateral do notch, do dock e da central. Os cards do Início se ajustam no próprio Início, em Personalizar."
    >
      <MenuFields />
    </PageFrame>
  )
}
