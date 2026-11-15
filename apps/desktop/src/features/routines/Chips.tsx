import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import { TRIGGER_ICONS, catalogAction } from './catalog'
import { TRIGGER_KINDS, triggerLabel, type RoutineStep, type Trigger } from './model'

export function TriggerChip({ trigger }: { trigger: Trigger }) {
  const Icon = TRIGGER_ICONS[trigger.kind]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
      <Icon className="size-3" aria-hidden />
      <span className="sr-only">{TRIGGER_KINDS[trigger.kind]}:</span>
      <span className="font-medium">{triggerLabel(trigger)}</span>
    </span>
  )
}

export function ActionChip({ catalogId, className }: { catalogId: string; className?: string }) {
  const { icon: Icon, label } = catalogAction(catalogId)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border-soft bg-surface-hover px-2 py-0.5 text-[11px]',
        className,
      )}
    >
      <Icon className="size-3 text-muted" aria-hidden />
      {label}
    </span>
  )
}

/** Trigger → step → step… flow, wrapping onto new lines when narrow. */
export function FlowChips({ trigger, steps }: { trigger: Trigger; steps: RoutineStep[] }) {
  const arrow = <ChevronRight className="size-3 shrink-0 text-muted" aria-hidden />
  return (
    <div className="flex flex-wrap items-center gap-1">
      <TriggerChip trigger={trigger} />
      {steps.map((s) => (
        <Fragment key={s.id}>
          {arrow}
          <ActionChip catalogId={s.catalogId} />
        </Fragment>
      ))}
      {steps.length === 0 && (
        <>
          {arrow}
          <span className="text-[11px] text-muted italic">sem ações</span>
        </>
      )}
    </div>
  )
}
