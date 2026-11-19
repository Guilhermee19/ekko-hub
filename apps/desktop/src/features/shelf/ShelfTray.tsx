import { Files, FolderOpen, X } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { ShelfItem, ShelfMode } from '@/lib/ipc'
import { Button, Segmented } from '@/ui/primitives'
import { fileKind, formatSize, KIND_ICON } from './fileKind'
import { useShelf } from './store'
import { useDragOut } from './useDragOut'

const MODES: { value: ShelfMode; label: string }[] = [
  { value: 'copy', label: 'Copiar' },
  { value: 'move', label: 'Mover' },
]

/**
 * Prateleira strip in the open notch: everything dropped on Ekko, ready to be dragged
 * out (all at once from the left handle, or one by one). Hidden when empty.
 */
export function ShelfTray() {
  const items = useShelf((s) => s.items)
  const mode = useShelf((s) => s.mode)
  const dragAll = useDragOut()
  if (items.length === 0) return null
  const { setMode, clear } = useShelf.getState()

  return (
    <section
      aria-label="Prateleira de arquivos"
      className="animate-fade-in flex shrink-0 items-center gap-3 border-t border-border-soft px-3 py-2.5"
    >
      <div
        {...dragAll}
        title="Arraste para soltar todos em outro lugar"
        className="flex h-[68px] w-[78px] shrink-0 cursor-grab flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-accent/40 bg-accent/5 text-accent transition-colors hover:bg-accent/10 active:cursor-grabbing"
      >
        <Files className="size-5" aria-hidden />
        <span className="text-[11px] font-medium tabular-nums">Arrastar {items.length}</span>
      </div>
      <ul className="scroll-thin flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {items.map((item) => (
          <ShelfTile key={item.id} item={item} />
        ))}
      </ul>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[11px] text-muted">Ao soltar</span>
        <Segmented value={mode} onChange={setMode} options={MODES} />
        <Button variant="ghost" className="h-6 px-2 text-[11px]" onClick={clear}>
          Limpar prateleira
        </Button>
      </div>
    </section>
  )
}

function ShelfTile({ item }: { item: ShelfItem }) {
  const drag = useDragOut([item.id])
  const { open, reveal, remove } = useShelf.getState()
  const Icon = KIND_ICON[fileKind(item.name, item.isDir)]
  const onKey = (e: KeyboardEvent) => e.key === 'Enter' && open(item.id)
  const detail = item.isDir ? 'Pasta' : formatSize(item.size)

  return (
    <li className="group relative shrink-0">
      <button
        type="button"
        {...drag}
        onDoubleClick={() => open(item.id)}
        onKeyDown={onKey}
        title={`${item.path}\n${detail} · clique duplo abre · arraste para outro lugar`}
        className="flex h-[68px] w-[76px] cursor-grab flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none active:cursor-grabbing"
      >
        <Icon className="size-6 text-accent" strokeWidth={1.5} aria-hidden />
        <span className="line-clamp-2 w-full text-center text-[10.5px] leading-tight break-all">
          {item.name}
        </span>
      </button>
      <div className="absolute top-0 right-0 flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <TileAction label={`Mostrar ${item.name} na pasta`} onClick={() => reveal(item.id)}>
          <FolderOpen className="size-3" />
        </TileAction>
        <TileAction label={`Tirar ${item.name} da prateleira`} onClick={() => remove(item.id)}>
          <X className="size-3" />
        </TileAction>
      </div>
    </li>
  )
}

function TileAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-[22px] place-items-center rounded-full bg-base/90 text-muted hover:text-content focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
    >
      {children}
    </button>
  )
}
