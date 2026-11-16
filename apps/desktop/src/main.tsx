import { StrictMode, useEffect, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { resolveSurface, type SurfaceId } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'
import { ConfirmHost } from '@/ui/ConfirmDialog'
import { useSettings } from '@/stores/settings'
import { AlarmSurface } from '@/surfaces/alarm/AlarmSurface'
import { DockSurface } from '@/surfaces/dock/DockSurface'
import { Gallery } from '@/surfaces/gallery/Gallery'
import { HubSurface } from '@/surfaces/hub/HubSurface'
import { NotchSurface } from '@/surfaces/notch/NotchSurface'
import { OnboardingSurface } from '@/surfaces/onboarding/OnboardingSurface'
import { OrbSurface } from '@/surfaces/orb/OrbSurface'
import { PaletteSurface } from '@/surfaces/palette/PaletteSurface'
import { PanelSurface } from '@/surfaces/panel/PanelSurface'
import { SettingsSurface } from '@/surfaces/settings/SettingsSurface'
import { VoiceSurface } from '@/surfaces/voice/VoiceSurface'
import { applyAppearance } from './theme/applyAppearance'
import './theme/tokens.css'

const SURFACES: Record<SurfaceId, ComponentType> = {
  gallery: Gallery,
  notch: NotchSurface,
  panel: PanelSurface,
  orb: OrbSurface,
  dock: DockSurface,
  hub: HubSurface,
  voice: VoiceSurface,
  settings: SettingsSurface,
  palette: PaletteSurface,
  onboarding: OnboardingSurface,
  alarm: AlarmSurface,
}

/** Opaque windows paint the base color; overlays stay transparent over the desktop. */
const OPAQUE: SurfaceId[] = ['gallery', 'hub', 'settings', 'onboarding']

const surface = resolveSurface()
document.body.dataset.opaque = String(OPAQUE.includes(surface))
// tokens.css scopes the interface scale to the full windows by this attribute.
document.body.dataset.surface = surface

function App() {
  const persona = useSettings((s) => s.settings.persona)
  useEffect(() => {
    void useSettings.getState().init()
    void useAssistant.getState().connect()
  }, [])
  // Persona repaints everything via tokens; no component knows themes exist.
  useEffect(() => {
    document.documentElement.dataset.persona = persona
  }, [persona])
  // Custom accent, tones and notch look are CSS variables layered over the persona.
  const appearance = useSettings((s) => s.settings.appearance)
  useEffect(() => applyAppearance(persona, appearance), [persona, appearance])

  const Surface = SURFACES[surface]
  return (
    <>
      <Surface />
      {/* Risky actions ask here, in whichever window started them. */}
      <ConfirmHost />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
