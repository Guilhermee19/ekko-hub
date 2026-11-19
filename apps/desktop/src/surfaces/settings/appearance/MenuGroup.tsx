import { ArrowDown, ArrowUp, GripVertical, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { PanelMenu } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { dropPillItem, movePillItem } from '@/lib/pillPriority'
import { menuRows, setPageVisible } from '@/surfaces/panel/menu'
import type { PageId } from '@/surfaces/panel/nav'
import { Toggle } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { Group, setAppearance, useAppearance } from './controls'

/** Which pages the panel menu shows (Início, Música, Timers...) and in what order. */
export function MenuGroup() {
  const menu = useAppearance().panelMenu
  const rows = menuRows(menu)
  const [dragging, setDragging] = useState<PageId | null>(null)
  const save = (panelMenu: PanelMenu) => setAppearance({ panelMenu })
  const order = rows.map((r) => r.item.id)
  const reorder = (next: PageId[]) => save({ ...menu, order: next })
  const custom = menu.order.length > 0 || menu.hidden.length > 0

  return (
    <Group title="Menu" hint="As páginas do painel, na lateral do notch, do dock e da central.">
      <Field
        title="Páginas e ordem"
        hint="Desligue o que não usa e arraste para mudar a ordem. Na bandeja e na bolha, as 5 primeiras ficam à vista e o resto vai para Mais."
      >
        <ol className="flex max-w-md flex-col gap-1.5" aria-label="Páginas do menu">
          {rows.map(({ item, visible }, i) => {
            const Icon = item.icon
            return (
              <li
                key={item.id}
                draggable
                onDragStart={(e) => {
                  setDragging(item.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragging && dragging !== item.id)
                    reorder(dropPillItem(order, dragging, item.id))
                  setDragging(null)
                }}
                className={cn(
                  'flex cursor-grab items-center gap-2 rounded-lg border bg-surface px-2 py-1.5',
                  dragging === item.id ? 'border-accent/50 opacity-60' : 'border-border-soft',
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
    </Group>
  )
}
