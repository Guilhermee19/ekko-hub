import { MoreHorizontal, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { useAssistant } from '@/stores/assistant'
import { EkkoFace } from '@/ui/EkkoFace'
import { NAV, type PageId } from './nav'
import { useNavBadges } from './badges'
import { useNavigateRequests } from './navigate'
import { PAGES } from './pages'

interface PanelShellProps {
  /** wide = sidebar (notch, dock, hub); compact = icon rail (tray/orb popover). */
  layout: 'wide' | 'compact'
  className?: string
}

/** The assistant panel shared by every display mode; only the window "shell" changes. */
export function PanelShell({ layout, className }: PanelShellProps) {
  const [page, setPage] = useState<PageId>('home')
  const wide = layout === 'wide'
  const Page = PAGES[page]
  const [more, setMore] = useState(false)
  const badges = useNavBadges()
  // Compact rail fits 5 pages; the rest go into the "Mais" menu.
  const rail = wide ? NAV : NAV.slice(0, 5)
  const overflow = wide ? [] : NAV.slice(5)
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
      <main key={page} className="scroll-thin min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
        <Page compact={!wide} go={open} />
      </main>
    </div>
  )
}

/** Mock progression until F5 tracks real usage (Kobi-style level/XP). */
const LEVEL = { level: 7, xp: 340, next: 500 }

function Identity() {
  const name = useSettings((s) => s.settings.assistantName)
  const phase = useAssistant((s) => s.phase)
  return (
    <div className="mb-2 px-1.5 py-1">
      <div className="flex items-center gap-2.5">
        <EkkoFace phase={phase} className="size-9" />
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">{name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="size-1.5 rounded-full bg-accent" /> Pronto
          </div>
        </div>
      </div>
      <div className="mt-2" title={`${LEVEL.xp} de ${LEVEL.next} XP`}>
        <div className="flex justify-between text-[10px] text-muted">
          <span className="label-hud">Nível {LEVEL.level}</span>
          <span className="font-mono tabular-nums">
            {LEVEL.xp}/{LEVEL.next}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-border-soft">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(LEVEL.xp / LEVEL.next) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
