import type { ReactNode } from 'react'
import { backend, DEFAULT_EVENT_ALERTS, type EventAlerts } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Card } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip } from './GeneralControls'

// When the notch nudges about Google Agenda events (Settings.general.eventAlerts).

const BEFORE = [0, 5, 10, 15, 30]
const REPEATS = [0, 1, 2, 3, 5]
const EVERY = [2, 5, 10, 15]

const minutes = (m: number) => (m === 0 ? 'Só na hora' : `${m} min antes`)
const times = (n: number) => (n === 0 ? 'Não repetir' : n === 1 ? '1 vez' : `${n} vezes`)

export function EventAlertsField() {
  const general = useSettings((s) => s.settings.general)
  const alerts = general.eventAlerts ?? DEFAULT_EVENT_ALERTS
  const set = (v: Partial<EventAlerts>) =>
    void backend.setGeneral({ ...general, eventAlerts: { ...alerts, ...v } })

  return (
    <Field
      title="Avisos da agenda"
      hint="O notch avisa antes do evento e na hora. Se você não confirmar, ele avisa de novo e o evento fica no notch com o ícone de atraso até você confirmar."
    >
      <Card className="flex flex-col gap-3">
        <Row label="Primeiro aviso">
          {BEFORE.map((m) => (
            <Chip key={m} active={alerts.beforeMin === m} onClick={() => set({ beforeMin: m })}>
              {minutes(m)}
            </Chip>
          ))}
        </Row>
        <Row label="Sem confirmação, avisar de novo">
          {REPEATS.map((n) => (
            <Chip key={n} active={alerts.repeats === n} onClick={() => set({ repeats: n })}>
              {times(n)}
            </Chip>
          ))}
        </Row>
        <Row label="A cada">
          {EVERY.map((m) => (
            <Chip
              key={m}
              active={alerts.everyMin === m}
              disabled={alerts.repeats === 0}
              onClick={() => set({ everyMin: m })}
            >
              {m} min
            </Chip>
          ))}
        </Row>
      </Card>
    </Field>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
