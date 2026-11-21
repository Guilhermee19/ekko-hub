import { CornerDownLeft, Search, Sparkles } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { pageShown } from '@/lib/availability'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import type { PageId } from '@/surfaces/panel/nav'
import { Badge } from '@/ui/data'
import { Kbd } from '@/ui/primitives'
import { comboKeys } from '@/surfaces/settings/sections/shortcutsCombo'
import { useChat } from '../chat/store'
import { buildCatalog, type PaletteCommand } from './catalog'
import { GROUP_LABEL, rankCommands } from './commands'

interface CommandPaletteProps {
  onClose: () => void
  /** Enables the "Ir para" group (panel pages). */
  onNavigate?: (page: PageId) => void
}

interface Row {
  cmd: PaletteCommand
  /** First row of a group carries the heading. */
  heading?: string
}

/** Spotlight-style box: type, ↑/↓, Enter. Fills a ~640px-wide transparent window. */
export function CommandPalette({ onClose, onNavigate }: CommandPaletteProps) {
  const assistant = useSettings((s) => s.settings.assistantName)
  const paletteCombo = useSettings((s) => s.settings.shortcuts.palette)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  /** A confirm dialog is open for the chosen command; the palette yields the keyboard. */
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const catalog = useMemo(() => buildCatalog({ onNavigate }), [onNavigate])
  const rows = useMemo(() => {
    const out: Row[] = []
    for (const g of rankCommands(catalog, query))
      g.items.forEach((cmd, i) =>
        out.push({ cmd, heading: i === 0 ? GROUP_LABEL[g.group] : undefined }),
      )
    const q = query.trim()
    // Asking Ekko needs the Conversa page, still a prototype until F2.
    if (q && pageShown('chat'))
      out.push({
        heading: 'Conversa',
        cmd: {
          id: 'ask',
          group: 'actions',
          label: `Perguntar ao ${assistant}: «${q}»`,
          icon: Sparkles,
          run: () => {
            useChat.getState().send(q)
            onNavigate?.('chat')
          },
        },
      })
    return out
  }, [catalog, query, assistant, onNavigate])

  const selected = Math.min(active, rows.length - 1)

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${selected}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const run = (row: Row | undefined) => {
    if (!row || busy) return
    const result = row.cmd.run()
    if (!result) return onClose()
    setBusy(true)
    void result.finally(() => {
      setBusy(false)
      onClose()
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (busy) return
    const n = rows.length
    if (e.key === 'ArrowDown' && n) setActive((selected + 1) % n)
    else if (e.key === 'ArrowUp' && n) setActive((selected - 1 + n) % n)
    else if (e.key === 'Enter') run(rows[selected])
    else if (e.key === 'Escape') onClose()
    else return
    e.preventDefault()
  }

  const optionId = (i: number) => `${listId}-${i}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onKeyDown={onKeyDown}
      className="ekko-shell flex max-h-full w-full max-w-[640px] flex-col overflow-hidden border border-border-soft"
    >
      <div className="flex items-center gap-3 border-b border-border-soft px-4">
        <Search className="size-4 shrink-0 text-accent" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          placeholder={`Digite um comando ou pergunte ao ${assistant}…`}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={rows.length ? optionId(selected) : undefined}
          aria-autocomplete="list"
          className="h-13 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        <Kbd>Esc</Kbd>
      </div>

      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label="Resultados"
        className="scroll-thin max-h-[380px] min-h-0 overflow-y-auto p-1.5"
      >
        {rows.length === 0 && (
          <p className="px-3 py-6 text-center text-[12px] text-muted">Nada encontrado.</p>
        )}
        {rows.map((row, i) => (
          <div key={row.cmd.id}>
            {row.heading && <div className="label-hud px-2.5 pt-2.5 pb-1">{row.heading}</div>}
            <PaletteRow
              row={row}
              id={optionId(i)}
              index={i}
              active={i === selected}
              onHover={() => setActive(i)}
              onRun={() => run(row)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-border-soft px-4 py-2 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Enter</Kbd> executar
        </span>
        <span className="ml-auto flex items-center gap-1">
          {comboKeys(paletteCombo).map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}{' '}
          abre de qualquer lugar
        </span>
      </div>
    </div>
  )
}

interface PaletteRowProps {
  row: Row
  id: string
  index: number
  active: boolean
  onHover: () => void
  onRun: () => void
}

function PaletteRow({ row: { cmd }, id, index, active, onHover, onRun }: PaletteRowProps) {
  const Icon = cmd.icon
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      data-index={index}
      onMouseMove={onHover}
      onClick={onRun}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-[13px]',
        active ? 'bg-accent/12 text-content' : 'text-content/90',
      )}
    >
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-md border',
          active ? 'border-accent/40 text-accent' : 'border-border-soft text-muted',
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{cmd.label}</span>
        {cmd.hint && <span className="block truncate text-[11px] text-muted">{cmd.hint}</span>}
      </span>
      {cmd.risk && (
        <Badge tone={cmd.risk === 'dangerous' ? 'danger' : 'accent'}>
          {cmd.risk === 'dangerous' ? 'Perigosa' : 'Confirma'}
        </Badge>
      )}
      {active && <CornerDownLeft className="size-3.5 shrink-0 text-accent" aria-hidden />}
    </div>
  )
}
