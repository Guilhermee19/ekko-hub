import { SeasonSky } from '@/features/season/SeasonSky'
import { useSeason } from '@/features/season/useSeason'
import { useAssistant } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { PanelShell } from '../panel/PanelShell'
import { EkkoBar } from '../shared/EkkoBar'
import { TitleBar } from '../shared/TitleBar'

/** Station: Ekko's big face (the notch's black, light and eyes) on the left, the full
 *  panel on the right. */
export function HubSurface() {
  const name = useSettings((s) => s.settings.assistantName)
  const phase = useAssistant((s) => s.phase)
  const season = useSeason()
  return (
    <div className="relative flex h-full flex-col bg-(--notch-ink)">
      <TitleBar title={`${name} · Central`} />
      <div className="relative z-10 flex min-h-0 flex-1 gap-4 p-4">
        <section className="flex w-[42%] flex-col items-center justify-center gap-4">
          <div
            data-season={season ?? undefined}
            className="ekko-glow relative grid aspect-[16/9] w-full max-w-md place-items-center overflow-hidden rounded-[calc(var(--notch-radius)+16px)]"
          >
            {season && <SeasonSky season={season} />}
            <EkkoEyes phase={phase} className="relative h-24 w-54" />
          </div>
          <EkkoBar className="w-full max-w-md rounded-full" />
        </section>
        <section className="ekko-shell min-w-0 flex-1 overflow-hidden border border-border-soft">
          <PanelShell layout="wide" className="h-full" />
        </section>
      </div>
    </div>
  )
}
