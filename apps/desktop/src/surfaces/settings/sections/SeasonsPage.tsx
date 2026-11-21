import { SeasonField } from '../appearance/SeasonField'
import { PageFrame } from './GeneralControls'

/** Holiday looks in the notch: on/off and a preview of each, in today's colors. */
export function SeasonsPage() {
  return (
    <PageFrame
      title="Temas de época"
      subtitle="Nas datas especiais o notch se enfeita. Os temas seguem a sua aparência: a cor de destaque, a persona e o visual do notch."
    >
      <SeasonField />
    </PageFrame>
  )
}
