import type { ReactNode } from 'react'
import { backend, type AppearanceSettings } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Toggle } from '@/ui/forms'
import { Slider } from '@/ui/primitives'

// Shared bits for the Aparência groups. Every control applies live (no save button).

export function useAppearance() {
  return useSettings((s) => s.settings.appearance)
}

/** Merges into the freshest settings so fast slider ticks never resurrect old values. */
export function setAppearance(patch: Partial<AppearanceSettings>) {
  const current = useSettings.getState().settings.appearance
  void backend.setAppearance({ ...current, ...patch })
}

/** Big block of the page ("Tema", "Notch", "Pílula", "Painel"). */
export function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-border-soft pt-6">
      <header>
        <h2 className="label-hud text-accent!">{title}</h2>
        <p className="mt-1 text-[12px] text-muted">{hint}</p>
      </header>
      {children}
    </section>
  )
}

/** Labeled slider with the current value always visible. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex w-full max-w-md items-center gap-3 text-[12px] text-muted">
      <span className="w-28 shrink-0">{label}</span>
      <Slider label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
      <span className="w-14 shrink-0 text-right font-mono text-content tabular-nums">
        {format(value)}
      </span>
    </label>
  )
}

/** Visible text + switch; the whole row reads as one setting. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span>
        <span className="block text-[13px]">{label}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  )
}

export const percent = (v: number) => `${Math.round(v * 100)}%`
