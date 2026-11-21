import { MoreHorizontal, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { useAssistant } from '@/stores/assistant'
import { EkkoEyes } from '@/ui/EkkoEyes'
import { useMenuNav } from './menu'
import type { PageId } from './nav'
import { useNavBadges } from './badges'
import { useNavigateRequests } from './navigate'
import { PAGES } from './pages'
import { PAGE_AVAILABILITY } from '@/lib/availability'
import { SoonBanner, SoonTag } from '@/ui/Availability'

interface PanelShellProps {
  /** wide = sidebar (notch, dock, hub); compact = icon rail (tray/orb popover). */
  layout: 'wide' | 'compact'
  className?: string
}

/** The assistant panel shared by every display mode; only the window "shell" changes. */
export function PanelShell({ layout, className }: PanelShellProps) {
  const nav = useMenuNav()
  // Opens on the first page of the user's menu (Início unless they moved or hid it).
  const [page, setPage] = useState<PageId>(() => nav[0]?.id ?? 'home')
  const wide = layout === 'wide'
  const Page = PAGES[page]
  const [more, setMore] = useState(false)
  const badges = useNavBadges()
  // Compact rail fits 5 pages; the rest go into the "Mais" menu.
  const rail = wide ? nav : nav.slice(0, 5)
  const overflow = wide ? [] : nav.slice(5)
  const open = (id: PageId) => {
    setPage(id)
    setMore(false)
  }
  useNavigateRequests(open)
  return (
    <div
      className={cn(
        'flex h-full min-h-0 text-content',
        wide ? 'flex-row' : 'flex-col-reverse',
        className,
      )}
    >
      <nav
        className={cn(
          'relative flex shrink-0 gap-0.5',
          wide
            ? 'scroll-thin w-44 flex-col overflow-y-auto border-r border-border-soft p-2'
            : 'justify-around border-t border-border-soft p-1.5',
        )}
      >
        {wide && <Identity />}
        {rail.map((item) => {
          const Icon = item.icon
          const active = item.id === page
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => open(item.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg text-[13px] transition-colors',
                wide ? 'px-2.5 py-1.5' : 'size-8 justify-center',
                active
                  ? 'bg-accent/12 text-accent'
                  : 'text-muted hover:bg-surface-hover hover:text-content',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {wide && <span className="flex-1 text-left">{item.label}</span>}
              {wide && <SoonTag availability={PAGE_AVAILABILITY[item.id]} />}
              {wide && badges[item.id] && (
                <span className="font-mono text-[10px] text-muted">{badges[item.id]}</span>
              )}
            </button>
          )
        })}
        {overflow.length > 0 && (
          <button
            type="button"
            title="Mais"
            aria-expanded={more}
            onClick={() => setMore((m) => !m)}
            className={cn(
              'grid size-8 place-items-center rounded-lg transition-colors',
              more || overflow.some((n) => n.id === page)
                ? 'bg-accent/12 text-accent'
                : 'text-muted hover:bg-surface-hover hover:text-content',
            )}
          >
            <MoreHorizontal className="size-4" />
          </button>
        )}
        {more && (
          <div className="animate-fade-in absolute right-1.5 bottom-full z-20 mb-1.5 flex w-44 flex-col gap-0.5 rounded-xl border border-border-soft bg-surface p-1.5 shadow-2xl">
            {overflow.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item.id)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
                    item.id === page
                      ? 'bg-accent/12 text-accent'
                      : 'text-muted hover:bg-surface-hover hover:text-content',
                  )}
                >
                  <Icon className="size-4" /> {item.label}
                </button>
              )
            })}
          </div>
        )}
        <button
          type="button"
          title="Configurações"
          onClick={() => void backend.openSettings()}
          className={cn(
            'flex items-center gap-2.5 rounded-lg text-[13px] text-muted hover:bg-surface-hover hover:text-content',
            wide ? 'mt-auto px-2.5 py-1.5' : 'size-8 justify-center',
          )}
        >
          <SettingsIcon className="size-4" />
          {wide && 'Configurações'}
        </button>
      </nav>
      {/* key: each page starts scrolled to the top. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Outside the scroller so full-height pages (chat) keep their layout. */}
        <SoonBanner availability={PAGE_AVAILABILITY[page]} className="mx-4 mt-3 shrink-0" />
        <main key={page} className="scroll-thin min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
          <Page compact={!wide} go={open} />
        </main>
      </div>
    </div>
  )
}

function Identity() {
  const name = useSettings((s) => s.settings.assistantName)
  const phase = useAssistant((s) => s.phase)
  return (
    <div className="mb-2 px-1.5 py-1">
      <div className="flex items-center gap-2.5">
        <span className="ekko-glow grid size-9 shrink-0 place-items-center rounded-xl">
          <EkkoEyes phase={phase} className="h-3 w-[26px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">{name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="size-1.5 rounded-full bg-accent" /> Pronto
          </div>
        </div>
      </div>
    </div>
  )
}
