import {
  Bot,
  Brain,
  Cable,
  Info,
  Keyboard,
  Mic,
  Palette,
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

const GROUPS: { title: string; items: { id: SectionId; label: string; icon: LucideIcon }[] }[] = [
  {
    title: 'Geral',
    items: [
      { id: 'general', label: 'Geral', icon: Settings2 },
      { id: 'appearance', label: 'Aparência', icon: Palette },
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

export function SettingsSurface() {
  const [section, setSection] = useState<SectionId>('appearance')
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
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto p-6">
          <Section key={section} />
        </main>
      </div>
    </div>
  )
}
