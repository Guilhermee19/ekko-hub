import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import type { PillItem, PillShow } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { movePillItem } from '@/lib/pillPriority'
import { useSortable } from '@/lib/useSortable'
import { Card, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { setAppearance, ToggleRow, useAppearance } from './controls'

const PARTS: { id: keyof PillShow; label: string; hint: string }[] = [
  { id: 'avatar', label: 'Avatar', hint: 'O rostinho do assistente à esquerda.' },
  { id: 'statusDot', label: 'Ponto de status', hint: 'Pontinho respirando quando está quieto.' },
  { id: 'clock', label: 'Relógio', hint: 'Hora atual no canto direito.' },
  { id: 'timer', label: 'Timers', hint: 'Contagem regressiva ao vivo.' },
  { id: 'music', label: 'Música', hint: 'O que está tocando agora.' },
  { id: 'event', label: 'Próximo evento', hint: 'Compromisso que está chegando.' },
  {
    id: 'battery',
    label: 'Bateria',
    hint: 'Avisa por 5 s quando começa a carregar e quando chega a 15%, 10% e 5%.',
  },
  {
    id: 'system',
    label: 'Reagir ao sistema',
    hint: 'Mostra por 5 s volume, brilho, Caps Lock, microfone mudo e fones conectados.',
  },
]

const ITEM_LABEL: Record<PillItem, string> = {
  timer: 'Timer',
  event: 'Evento',
  music: 'Música',
}

/** What the collapsed pill may show and which activity wins when several happen. */
export function PillFields() {
  const look = useAppearance()
  const setShow = (patch: Partial<PillShow>) =>
    setAppearance({ pillShow: { ...look.pillShow, ...patch } })

  return (
    <>
      <Field title="O que mostrar" hint="Desligado aqui, nunca aparece na pílula.">
        <Card className="max-w-xl divide-y divide-border-soft px-4 py-0.5">
          {PARTS.map((p) => (
            <ToggleRow
              key={p.id}
              label={p.label}
              hint={p.hint}
              checked={look.pillShow[p.id]}
              onChange={(v) => setShow({ [p.id]: v })}
            />
          ))}
        </Card>
      </Field>

      <Field
        title="Prioridade"
        hint="Quando várias coisas acontecem juntas, a de cima ganha. Arraste ou use as setas."
      >
        <PriorityList priority={look.pillPriority} />
      </Field>
    </>
  )
}

function PriorityList({ priority }: { priority: PillItem[] }) {
  const save = (pillPriority: PillItem[]) => setAppearance({ pillPriority })
  const sort = useSortable(priority, save)

  return (
    <ol className="flex max-w-sm flex-col gap-1.5" aria-label="Prioridade da pílula">
      {sort.list.map((item, i) => (
        <li
          key={item}
          ref={sort.itemRef(item)}
          {...sort.handle(item)}
          className={cn(
            'flex cursor-grab touch-none items-center gap-2 rounded-lg border bg-surface px-2 py-1.5 transition-colors select-none',
            sort.dragging === item
              ? 'border-dashed border-accent/60 bg-accent/5 [&>*]:opacity-30'
              : 'border-border-soft',
          )}
        >
          <GripVertical className="size-4 text-muted" aria-hidden />
          <span className="w-5 font-mono text-[12px] text-accent">{i + 1}</span>
          <span className="flex-1 text-[13px]">{ITEM_LABEL[item]}</span>
          <IconButton
            label={`Subir ${ITEM_LABEL[item]}`}
            disabled={i === 0}
            onClick={() => save(movePillItem(priority, item, -1))}
            className="size-7"
          >
            <ArrowUp className="size-3.5" />
          </IconButton>
          <IconButton
            label={`Descer ${ITEM_LABEL[item]}`}
            disabled={i === priority.length - 1}
            onClick={() => save(movePillItem(priority, item, 1))}
            className="size-7"
          >
            <ArrowDown className="size-3.5" />
          </IconButton>
        </li>
      ))}
    </ol>
  )
}
