import { useSettings } from '@/stores/settings'
import { DndField, SoundField } from './GeneralAlerts'
import { PageFrame } from './GeneralControls'

/** How Ekko gets your attention: sound and quiet hours. */
export function NotificationsSettingsPage() {
  const name = useSettings((s) => s.settings.assistantName)
  return (
    <PageFrame
      title="Notificações"
      subtitle={`Como o ${name} chama a sua atenção: o som dos avisos e o horário de silêncio.`}
    >
      <SoundField />
      <DndField />
    </PageFrame>
  )
}
