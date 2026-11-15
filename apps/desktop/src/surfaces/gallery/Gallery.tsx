import { Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { backend, type DisplayMode, type Persona } from '@/lib/ipc'
import { MOCK_PANEL_EVENT } from '@/lib/ipc/mock'
import { cn } from '@/lib/cn'
import { DEMO_LABELS, demo, type DemoKey } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { Button, Segmented } from '@/ui/primitives'
import { MODES } from '../settings/DisplayModePicker'
import { SettingsSurface } from '../settings/SettingsSurface'
import { FakeDesktop } from './FakeDesktop'
import { FLOW_DEMOS, GalleryFlowWindows } from './GalleryFlows'

/**
 * Browser-only prototype viewer (`npm run dev`). Shows each display mode on a fake
 * Windows desktop with the mock backend, so screens can be reviewed without Tauri.
 */
export function Gallery() {
  const { displayMode, persona } = useSettings((s) => s.settings)
  // Popover belongs to the mode it was opened in, so switching modes closes it.
  const [popoverMode, setPopoverMode] = useState<DisplayMode | null>(null)
  const popover = popoverMode === displayMode
  const togglePopover = () => setPopoverMode((m) => (m === displayMode ? null : displayMode))
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const off = backend.listen(MOCK_PANEL_EVENT, () =>
      setPopoverMode((m) => (m ? null : useSettings.getState().settings.displayMode)),
    )
    return () => void off.then((f) => f())
  }, [])

  return (
    <div className="scroll-thin flex h-full flex-col overflow-auto bg-base">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border-soft px-6 py-3">
        <div>
          <div className="label-hud">Ekko Hub · protótipo F1b</div>
          <div className="text-[15px] font-semibold">Modos de exibição</div>
        </div>
        <Segmented
          value={displayMode}
          options={MODES.map((m) => ({ value: m.id, label: m.label }))}
          onChange={(m) => void backend.setDisplayMode(m)}
        />
        <Segmented<Persona>
          value={persona}
          options={[
            { value: 'ekko', label: 'Ekko' },
            { value: 'eco', label: 'Eco' },
            { value: 'ultron', label: 'Ultron' },
          ]}
          onChange={(p) => void backend.setPersona(p)}
        />
        <Button
          onClick={() => setSettingsOpen((v) => !v)}
          variant={settingsOpen ? 'primary' : 'subtle'}
        >
          <SettingsIcon className="size-4" /> Configurações
        </Button>
      </header>

      <div className="flex flex-wrap gap-1.5 border-b border-border-soft px-6 py-2">
        <span className="label-hud mr-2 self-center">Simular</span>
        {(Object.keys(DEMO_LABELS) as DemoKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={demo[key]}
            className={cn(
              'rounded-full border border-border-soft px-3 py-1 text-[12px] text-muted hover:border-accent/40 hover:text-content',
              key === 'conversation' && 'border-accent/40 text-accent',
            )}
          >
            {DEMO_LABELS[key]}
          </button>
        ))}
        <span className="label-hud mr-2 ml-4 self-center">Fluxos</span>
        {FLOW_DEMOS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={f.run}
            className="rounded-full border border-border-soft px-3 py-1 text-[12px] text-muted hover:border-accent/40 hover:text-content"
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative flex flex-1 items-start justify-center p-6">
        <GalleryFlowWindows />
        {settingsOpen ? (
          <div className="h-[680px] w-[1000px] overflow-hidden rounded-xl border border-border-soft shadow-2xl">
            <SettingsSurface />
          </div>
        ) : (
          <FakeDesktop mode={displayMode} popover={popover} onTogglePopover={togglePopover} />
        )}
      </div>
    </div>
  )
}
