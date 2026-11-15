import type { ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// Small building blocks shared by the assistant settings pages (General, Avatar, Brain,
// Voice, Shortcuts). Candidates for `ui/forms.tsx` once the other sections need them.

/** Page frame copied from AppearancePage: title, subtitle, optional badge. */
export function PageFrame({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string
  subtitle: string
  badge?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="flex items-center gap-2 text-[20px] font-semibold">
          {title} {badge}
        </h1>
        <p className="text-[13px] text-muted">{subtitle}</p>
      </header>
      {children}
    </div>
  )
}

/** Native select in the HUD style. Pass `aria-label` when there is no visible label. */
export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-border-soft bg-base px-2.5 py-1.5 text-[13px] text-content outline-none',
        'focus:border-accent/50 disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

/** Selectable pill (moods, eyes, personality…). */
export function Chip({
  active,
  onClick,
  children,
  label,
  className,
  disabled,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  /** Accessible name when the chip shows only an icon. */
  label?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-40',
        active
          ? 'border-accent/60 bg-accent/10 text-accent'
          : 'border-border-soft text-muted hover:border-accent/30 hover:text-content',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** One line inside a settings card: text on the left, control on the right. */
export function Row({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[13px]">{title}</div>
        {hint && <div className="text-[11px] text-muted">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}
