import type { ComponentType } from 'react'
import { AppearancePage } from './AppearancePage'
import { GeneralPage } from './sections/GeneralPage'
import { AvatarPage } from './sections/AvatarPage'
import { BrainPage } from './sections/BrainPage'
import { VoicePage } from './sections/VoicePage'
import { ToolsPage } from './sections/ToolsPage'
import { ShortcutsPage } from './sections/ShortcutsPage'
import { PrivacyPage } from './sections/PrivacyPage'
import { ConnectionsPage } from './sections/ConnectionsPage'
import { DiagnosticsPage } from './sections/DiagnosticsPage'
import { AboutPage } from './sections/AboutPage'
import { ClipboardSettingsPage } from './sections/ClipboardSettingsPage'
import { DisplayPage } from './sections/DisplayPage'
import { MenuPage } from './sections/MenuPage'
import { NotchPage } from './sections/NotchPage'
import { NotificationsSettingsPage } from './sections/NotificationsSettingsPage'
import { PillPage } from './sections/PillPage'
import { SeasonsPage } from './sections/SeasonsPage'

export type SectionId =
  | 'general'
  | 'notifications'
  | 'clipboard'
  | 'appearance'
  | 'display'
  | 'notch'
  | 'pill'
  | 'seasons'
  | 'menu'
  | 'avatar'
  | 'brain'
  | 'voice'
  | 'tools'
  | 'shortcuts'
  | 'privacy'
  | 'connections'
  | 'diagnostics'
  | 'about'

export const SECTIONS: Record<SectionId, ComponentType> = {
  general: GeneralPage,
  notifications: NotificationsSettingsPage,
  clipboard: ClipboardSettingsPage,
  appearance: AppearancePage,
  display: DisplayPage,
  notch: NotchPage,
  pill: PillPage,
  seasons: SeasonsPage,
  menu: MenuPage,
  avatar: AvatarPage,
  brain: BrainPage,
  voice: VoicePage,
  tools: ToolsPage,
  shortcuts: ShortcutsPage,
  privacy: PrivacyPage,
  connections: ConnectionsPage,
  diagnostics: DiagnosticsPage,
  about: AboutPage,
}
