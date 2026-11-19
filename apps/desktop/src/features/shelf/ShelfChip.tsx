import { Files } from 'lucide-react'
import { useShelf } from './store'
import { useDragOut } from './useDragOut'

/** Room the chip takes in the pill (see notch/layout.ts). */
export const SHELF_CHIP_W = 52

/**
 * Shelf count on the closed pill. Drag it to take every file out at once, without
 * opening the notch.
 */
export function ShelfChip() {
  const count = useShelf((s) => s.items.length)
  const drag = useDragOut()
  if (count === 0) return null
  const label = `${count} ${count === 1 ? 'arquivo' : 'arquivos'} na prateleira. Arraste para soltar em outro lugar`
  return (
    <div
      {...drag}
      role="img"
      aria-label={label}
      title={label}
      className="mr-2 flex h-6 shrink-0 cursor-grab items-center gap-1 rounded-full bg-content/10 px-2 text-[11px] font-medium text-content tabular-nums transition-colors hover:bg-content/20 active:cursor-grabbing"
    >
      <Files className="size-3.5" aria-hidden />
      {count}
    </div>
  )
}
