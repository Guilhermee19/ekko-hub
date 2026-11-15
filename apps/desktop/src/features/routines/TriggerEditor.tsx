import { cn } from '@/lib/cn'
import { Input } from '@/ui/forms'
import { Segmented } from '@/ui/primitives'
import { TRIGGER_ICONS } from './catalog'
import {
  DAYS,
  EVENTS,
  TRIGGER_KINDS,
  defaultTrigger,
  type Days,
  type EventId,
  type Trigger,
  type TriggerKind,
} from './model'

const DAY_OPTIONS = (Object.keys(DAYS) as Days[]).map((value) => ({ value, label: DAYS[value] }))

export function TriggerEditor({
  value,
  onChange,
}: {
  value: Trigger
  onChange: (t: Trigger) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div role="radiogroup" aria-label="Tipo de gatilho" className="grid grid-cols-3 gap-1.5">
        {(Object.keys(TRIGGER_KINDS) as TriggerKind[]).map((kind) => {
          const Icon = TRIGGER_ICONS[kind]
          const active = value.kind === kind
          return (
            <button
              key={kind}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && onChange(defaultTrigger(kind))}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] transition-colors',
                active
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-border-soft text-muted hover:border-accent/30 hover:text-content',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {TRIGGER_KINDS[kind]}
            </button>
          )
        })}
      </div>

      {value.kind === 'time' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32 shrink-0">
            <Input
              type="time"
              aria-label="Horário"
              value={value.time}
              onChange={(e) => onChange({ ...value, time: e.target.value || value.time })}
              className="font-mono tabular-nums [color-scheme:dark]"
            />
          </div>
          <Segmented
            value={value.days}
            options={DAY_OPTIONS}
            onChange={(days) => onChange({ ...value, days })}
          />
        </div>
      )}

      {value.kind === 'phrase' && (
        <Input
          aria-label="Frase que dispara a rotina"
          placeholder="Ex.: bom dia"
          value={value.phrase}
          onChange={(e) => onChange({ ...value, phrase: e.target.value })}
        />
      )}

      {value.kind === 'event' && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(EVENTS) as EventId[]).map((event) => (
            <button
              key={event}
              type="button"
              aria-pressed={value.event === event}
              onClick={() => onChange({ ...value, event })}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[12px] transition-colors first-letter:uppercase',
                value.event === event
                  ? 'border-accent/50 bg-accent/10 text-accent'
                  : 'border-border-soft text-muted hover:text-content',
              )}
            >
              {EVENTS[event]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
