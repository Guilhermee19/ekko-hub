import {
  Bell,
  Bot,
  Brain,
  Cable,
  Clipboard,
  Info,
  Keyboard,
  ListOrdered,
  Mic,
  Monitor,
  Palette,
  PanelTop,
  RectangleHorizontal,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { TitleBar } from '../shared/TitleBar'
import { SECTIONS, type SectionId } from './sections'
import { SECTION_AVAILABILITY, sectionShown } from '@/lib/availability'
import { SoonBanner, SoonTag } from '@/ui/Availability'

const ALL_GROUPS: { title: string; items: { id: SectionId; label: string; icon: LucideIcon }[] }[] =
  [
    {
      title: 'Geral',
      items: [
        { id: 'general', label: 'Geral', icon: Settings2 },
        { id: 'notifications', label: 'Notificações', icon: Bell },
        { id: 'clipboard', label: 'Copiados', icon: Clipboard },
      ],
    },
    {
      title: 'Visual',
      items: [
        { id: 'appearance', label: 'Aparência', icon: Palette },
        { id: 'display', label: 'Modo de exibição', icon: Monitor },
        { id: 'notch', label: 'Notch', icon: PanelTop },
        { id: 'pill', label: 'Pílula e avisos', icon: RectangleHorizontal },
        { id: 'menu', label: 'Menu do painel', icon: ListOrdered },
        { id: 'avatar', label: 'Avatar', icon: Bot },
      ],
    },
    {
      title: 'Assistente',
      items: [
        { id: 'brain', label: 'Cérebro (IA)', icon: Brain },
        { id: 'voice', label: 'Voz', icon: Mic },
        { id: 'tools', label: 'Funções e autonomia', icon: Wrench },
        { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { id: 'privacy', label: 'Privacidade', icon: ShieldCheck },
        { id: 'connections', label: 'Conexões', icon: Cable },
        { id: 'diagnostics', label: 'Diagnóstico', icon: Stethoscope },
        { id: 'about', label: 'Sobre', icon: Info },
      ],
    },
  ]

/** Sections still "Em breve" stay hidden until their phase lands. */
const GROUPS = ALL_GROUPS.map((g) => ({
  ...g,
  items: g.items.filter((i) => sectionShown(i.id)),
})).filter((g) => g.items.length > 0)

export function SettingsSurface() {
  const [section, setSection] = useState<SectionId>('general')
  const Section = SECTIONS[section]
  return (
    <div className="flex h-full flex-col bg-base">
      <TitleBar title="Ekko · Configurações" />
      <div className="flex min-h-0 flex-1">
        <nav className="scroll-thin flex w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border-soft p-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="label-hud mb-1.5 px-2">{group.title}</div>
              {group.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
                    id === section
                      ? 'bg-accent/12 text-accent'
                      : 'text-muted hover:bg-surface-hover hover:text-content',
                  )}
                >
                  <Icon className="size-4" /> <span className="flex-1 text-left">{label}</span>
                  <SoonTag availability={SECTION_AVAILABILITY[id]} />
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto p-6">
          <SoonBanner
            availability={SECTION_AVAILABILITY[section]}
            className="mx-auto mb-6 max-w-3xl"
          />
          <Section key={section} />
        </main>
      </div>
    </div>
  )
}
