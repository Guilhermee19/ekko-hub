import { useEffect, useState } from 'react'
import { demoAlarm } from '@/features/notifications/AlarmOverlay'
import { useNotifications } from '@/features/notifications/store'
import { backend } from '@/lib/ipc'
import {
  MOCK_ALARM_EVENT,
  MOCK_HIDE_EVENT,
  MOCK_ONBOARDING_EVENT,
  MOCK_PALETTE_EVENT,
} from '@/lib/ipc/mock'
import { demoConfirm } from '@/ui/ConfirmDialog'
import { AlarmSurface } from '../alarm/AlarmSurface'
import { OnboardingSurface } from '../onboarding/OnboardingSurface'
import { PaletteSurface } from '../palette/PaletteSurface'

/** Gallery buttons for flows that are separate windows (or dialogs) in the real app. */
export const FLOW_DEMOS: { label: string; run: () => void }[] = [
  { label: 'Paleta (Alt+Shift+Espaço)', run: () => void backend.togglePalette() },
  { label: 'Boas-vindas', run: () => void backend.openOnboarding() },
  { label: 'Confirmação de risco', run: () => void demoConfirm() },
  { label: 'Alarme', run: () => void backend.showAlarm(demoAlarm()) },
  {
    label: 'Notificação',
    run: () =>
      useNotifications.getState().notify({
        kind: 'reminder',
        title: 'Beber água',
        body: 'Faz 1 hora desde o último copo.',
      }),
  },
]

/** Overlays standing in for the palette / onboarding / alarm windows. */
export function GalleryFlowWindows() {
  const [palette, setPalette] = useState(false)
  const [onboarding, setOnboarding] = useState(false)
  const [alarm, setAlarm] = useState(false)

  useEffect(() => {
    const offs = [
      backend.listen(MOCK_PALETTE_EVENT, () => setPalette((v) => !v)),
      backend.listen<boolean>(MOCK_ONBOARDING_EVENT, (v) => setOnboarding(v)),
      backend.listen(MOCK_ALARM_EVENT, () => setAlarm(true)),
      backend.listen(MOCK_HIDE_EVENT, () => {
        setPalette(false)
        setAlarm(false)
      }),
    ]
    return () => offs.forEach((off) => void off.then((f) => f()))
  }, [])

  return (
    <>
      {palette && (
        // In Tauri the palette hides on blur; here a click outside does it.
        <div
          className="absolute inset-0 z-30 pt-16"
          onClick={(e) => e.target === e.currentTarget && setPalette(false)}
        >
          <div className="mx-auto h-[540px] w-[680px]">
            <PaletteSurface />
          </div>
        </div>
      )}
      {alarm && (
        <div className="absolute inset-x-0 top-20 z-30 mx-auto h-[300px] w-[460px]">
          <AlarmSurface />
        </div>
      )}
      {onboarding && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-base/70">
          <div className="h-[560px] w-[760px] overflow-hidden rounded-xl border border-border-soft shadow-2xl">
            <OnboardingSurface />
          </div>
        </div>
      )}
    </>
  )
}
