import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/primitives'

// Small controls shared by the "Sistema" pages. Candidates for `ui/forms.tsx`.

export function PageTitle({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <header>
      <h1 className="text-[20px] font-semibold">{title}</h1>
      <p className="text-[13px] text-muted">{subtitle}</p>
    </header>
  )
}

interface SelectProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  label: string
  onChange: (v: T) => void
  className?: string
}

/** Native select in the HUD style (keyboard + screen reader for free). */
export function Select<T extends string>({
  value,
  options,
  label,
  onChange,
  className,
}: SelectProps<T>) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'rounded-lg border border-border-soft bg-base px-2 py-1 text-[12px] text-content outline-none',
        'focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-surface">
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Toggleable filter chip. */
export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-[12px] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
        active
          ? 'border-accent/50 bg-accent/12 text-accent'
          : 'border-border-soft text-muted hover:border-accent/30 hover:text-content',
      )}
    >
      {children}
    </button>
  )
}

/** Status dot: on = accent glow, off = muted, error = danger. */
export function StatusDot({ tone }: { tone: 'on' | 'off' | 'error' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        tone === 'on' && 'hud-glow bg-accent text-accent',
        tone === 'off' && 'bg-muted/60',
        tone === 'error' && 'bg-danger',
      )}
    />
  )
}

interface InlineConfirmProps {
  /** Visible trigger text ("Remover", "Apagar histórico"). */
  label: string
  question: string
  confirmLabel: string
  onConfirm: () => void
  size?: 'md' | 'sm'
}

/** Destructive action that asks inline before running (no modal). */
export function InlineConfirm({
  label,
  question,
  confirmLabel,
  onConfirm,
  size = 'sm',
}: InlineConfirmProps) {
  const [asking, setAsking] = useState(false)
  if (!asking)
    return (
      <Button
        variant={size === 'sm' ? 'ghost' : 'danger'}
        size={size}
        onClick={() => setAsking(true)}
      >
        {label}
      </Button>
    )
  return (
    <span className="inline-flex items-center gap-1.5" role="group" aria-label={question}>
      <span className="text-[12px] text-muted">{question}</span>
      <Button size={size} variant="ghost" onClick={() => setAsking(false)}>
        Cancelar
      </Button>
      <Button
        size={size}
        variant="danger"
        autoFocus
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </Button>
    </span>
  )
}
