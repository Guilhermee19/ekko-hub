import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from 'lucide-react'
import type { PanelMenu } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { movePillItem } from '@/lib/pillPriority'
import { useSortable } from '@/lib/useSortable'
import { menuRows, setPageVisible } from '@/surfaces/panel/menu'
import type { PageId } from '@/surfaces/panel/nav'
import { Toggle } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { setAppearance, useAppearance } from './controls'

/** Which pages the panel menu shows (Início, Música, Timers...) and in what order. */
export function MenuFields() {
  const menu = useAppearance().panelMenu
  const rows = menuRows(menu)
  const save = (panelMenu: PanelMenu) => setAppearance({ panelMenu })
  const order = rows.map((r) => r.item.id)
  const reorder = (next: PageId[]) => save({ ...menu, order: next })
  const sort = useSortable(order, reorder)
  const byId = new Map(rows.map((r) => [r.item.id, r]))
  const custom = menu.order.length > 0 || menu.hidden.length > 0

  return (
    <>
      <Field
        title="Páginas e ordem"
        hint="Desligue o que não usa e arraste para mudar a ordem. Na bandeja e na bolha, as 5 primeiras ficam à vista e o resto vai para Mais."
      >
        <ol className="flex max-w-md flex-col gap-1.5" aria-label="Páginas do menu">
          {sort.list.map((id, i) => {
            const { item, visible } = byId.get(id) as (typeof rows)[number]
            const Icon = item.icon
            return (
              <li
                key={item.id}
                ref={sort.itemRef(item.id)}
                {...sort.handle(item.id)}
                className={cn(
                  'flex cursor-grab touch-none items-center gap-2 rounded-lg border bg-surface px-2 py-1.5 transition-colors select-none',
                  sort.dragging === item.id
                    ? 'border-dashed border-accent/60 bg-accent/5 [&>*]:opacity-30'
                    : 'border-border-soft',
                )}
              >
                <GripVertical className="size-4 text-muted" aria-hidden />
                <Icon
                  className={cn('size-4', visible ? 'text-accent' : 'text-muted')}
                  aria-hidden
                />
                <span className={cn('flex-1 text-[13px]', !visible && 'text-muted')}>
                  {item.label}
                </span>
                <IconButton
                  label={`Subir ${item.label} no menu`}
                  disabled={i === 0}
                  onClick={() => reorder(movePillItem(order, item.id, -1))}
                  className="size-7"
                >
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton
                  label={`Descer ${item.label} no menu`}
                  disabled={i === rows.length - 1}
                  onClick={() => reorder(movePillItem(order, item.id, 1))}
                  className="size-7"
                >
                  <ArrowDown className="size-3.5" />
                </IconButton>
                <Toggle
                  label={`Mostrar ${item.label} no menu`}
                  checked={visible}
                  onChange={(on) => save(setPageVisible(menu, rows, item.id, on))}
                />
              </li>
            )
          })}
        </ol>
        {custom && (
          <Button
            size="sm"
            className="mt-3 self-start"
            onClick={() => save({ order: [], hidden: [] })}
          >
            <RotateCcw className="size-3.5" /> Voltar ao padrão
          </Button>
        )}
      </Field>
    </>
  )
}
