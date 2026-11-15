import { useAssistant } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'
import { EkkoCore } from '@/ui/EkkoCore'
import { HudFrame } from '@/ui/primitives'
import { PanelShell } from '../panel/PanelShell'
import { PresenceLine } from '../shared/PresenceLine'
import { TitleBar } from '../shared/TitleBar'

const LEVEL = { idle: 0, listening: 0.55, thinking: 0.2, speaking: 0.8 } as const

/** Jarvis-style station: big HUD core on the left, full panel on the right. */
export function HubSurface() {
  const name = useSettings((s) => s.settings.assistantName)
  const phase = useAssistant((s) => s.phase)
  return (
    <div className="relative flex h-full flex-col bg-base">
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="hud-vignette pointer-events-none absolute inset-0" />
      <HudFrame />
      <TitleBar title={`${name} · Central`} />
      <div className="relative z-10 flex min-h-0 flex-1 gap-4 p-4">
        <section className="flex w-[42%] flex-col items-center justify-center gap-6">
          <EkkoCore
            label={name}
            active={phase !== 'idle'}
            level={LEVEL[phase]}
            className="size-72"
          />
          <div className="glass flex h-11 w-full max-w-sm items-center rounded-full">
            <PresenceLine />
          </div>
        </section>
        <section className="glass min-w-0 flex-1 overflow-hidden rounded-2xl">
          <PanelShell layout="wide" className="h-full" />
        </section>
      </div>
    </div>
  )
}
