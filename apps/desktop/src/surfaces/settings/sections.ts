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

export type SectionId =
  | 'general'
  | 'appearance'
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
  appearance: AppearancePage,
  general: GeneralPage,
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
