import { ArrowLeft, ArrowRight, GripVertical, Plus, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { movePillItem } from '@/lib/pillPriority'
import { useSortable } from '@/lib/useSortable'
import type { PageProps } from '@/surfaces/panel/pages'
import { setAppearance } from '@/surfaces/settings/appearance/controls'
import { useSettings } from '@/stores/settings'
import { IconButton } from '@/ui/primitives'
import { cardMeta, homeLayout, missingCards, type HomeCardId } from './catalog'
import { CARD_VIEW } from './cardViews'

const save = (homeCards: HomeCardId[] | null) => setAppearance({ homeCards })

/** The home's cards in the user's order; `editing` turns on move/remove/add. */
export function HomeCards({
  compact,
  go,
  editing,
}: Pick<PageProps, 'compact' | 'go'> & { editing: boolean }) {
  const layout = homeLayout(useSettings((s) => s.settings.appearance.homeCards))
  const sort = useSortable(layout, save)

  if (layout.length === 0 && !editing) {
    return (
      <p className="rounded-xl border border-dashed border-border-soft p-4 text-center text-[12px] text-muted">
        Seu Início está vazio. Use Personalizar para escolher os cards.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 @lg:grid-cols-4')}>
        {sort.list.map((id, i) => {
          const View = CARD_VIEW[id]
          const meta = cardMeta(id)
          return (
            <li
              key={id}
              ref={sort.itemRef(id)}
              {...(editing ? sort.handle(id) : {})}
              className={cn(
                'flex min-w-0 flex-col gap-1',
                meta.wide && 'col-span-full',
                editing &&
                  'animate-fade-in cursor-grab rounded-xl border border-dashed border-accent/40 p-1',
                editing && 'touch-none select-none',
                sort.dragging === id && 'border-accent bg-accent/5 [&>*]:opacity-25',
              )}
            >
              {editing && (
                <div className="flex items-center gap-0.5 text-muted">
                  <GripVertical className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[11px]">{meta.label}</span>
                  <IconButton
                    label={`Mover ${meta.label} para trás`}
                    disabled={i === 0}
                    onClick={() => save(movePillItem(layout, id, -1))}
                    className="size-6"
                  >
                    <ArrowLeft className="size-3" />
                  </IconButton>
                  <IconButton
                    label={`Mover ${meta.label} para frente`}
                    disabled={i === layout.length - 1}
                    onClick={() => save(movePillItem(layout, id, 1))}
                    className="size-6"
                  >
                    <ArrowRight className="size-3" />
                  </IconButton>
                  <IconButton
                    label={`Remover ${meta.label}`}
                    tone="danger"
                    onClick={() => save(layout.filter((c) => c !== id))}
                    className="size-6"
                  >
                    <X className="size-3" />
                  </IconButton>
                </div>
              )}
              {/* While editing the card is a picture of itself: no clicks get through. */}
              <div
                className={cn(
                  'min-h-0 flex-1',
                  editing && 'pointer-events-none opacity-80 select-none',
                )}
              >
                <View go={go} compact={compact} editing={editing} />
              </div>
            </li>
          )
        })}
      </ul>
      {editing && <AddCards layout={layout} />}
    </div>
  )
}

/** Cards that can come in, plus going back to the default set. */
function AddCards({ layout }: { layout: HomeCardId[] }) {
  const missing = missingCards(layout)
  const custom = useSettings((s) => s.settings.appearance.homeCards) !== null
  return (
    <section className="animate-rise-in rounded-xl border border-dashed border-border-soft p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-hud">Adicionar card</span>
        {custom && (
          <button
            type="button"
            onClick={() => save(null)}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-accent"
          >
            <RotateCcw className="size-3" /> Voltar ao padrão
          </button>
        )}
      </div>
      {missing.length === 0 ? (
        <p className="text-[12px] text-muted">Todos os cards já estão no Início.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1.5 @md:grid-cols-2">
          {missing.map((c) => {
            const Icon = c.icon
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => save([...layout, c.id])}
                  className="group flex w-full items-center gap-2.5 rounded-lg border border-border-soft px-2.5 py-2 text-left transition-colors hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent/12 text-accent">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium">{c.label}</span>
                    <span className="block truncate text-[11px] text-muted">{c.hint}</span>
                  </span>
                  <Plus
                    className="size-4 text-muted transition-transform group-hover:scale-110 group-hover:text-accent"
                    aria-hidden
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
