import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent-strong text-white hover:brightness-110',
  subtle: 'bg-surface-hover text-content hover:bg-border-soft',
  ghost: 'text-muted hover:bg-surface-hover hover:text-content',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** sm = inline row actions (confirm, undo). */
  size?: 'md' | 'sm'
}

export function Button({ variant = 'subtle', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        size === 'md' ? 'px-3 py-1.5 text-[13px]' : 'px-2 py-1 text-[12px]',
        'transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
  tone?: 'default' | 'accent' | 'danger'
}

export function IconButton({
  label,
  active,
  tone = 'default',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40',
        'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
        tone === 'accent' && 'bg-accent text-(--color-base) hover:brightness-110',
        tone === 'danger' && 'bg-danger/15 text-danger hover:bg-danger/25',
        tone === 'default' &&
          (active
            ? 'bg-accent/15 text-accent'
            : 'text-muted hover:bg-surface-hover hover:text-content'),
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-border-soft bg-surface p-3', className)}>
      {children}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border-soft bg-surface-hover px-1.5 py-0.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  )
}

export function HudFrame() {
  const corner = 'absolute size-3.5 border-accent/40'
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-1.5 border border-accent/10" />
      <span className={cn(corner, 'top-1.5 left-1.5 border-t border-l')} />
      <span className={cn(corner, 'top-1.5 right-1.5 border-t border-r')} />
      <span className={cn(corner, 'bottom-1.5 left-1.5 border-b border-l')} />
      <span className={cn(corner, 'right-1.5 bottom-1.5 border-r border-b')} />
    </div>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-lg border border-border-soft bg-base p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[12px] transition-colors',
            o.value === value ? 'bg-accent/15 text-accent' : 'text-muted hover:text-content',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  disabled?: boolean
  label: string
  onChange: (v: number) => void
}

export function Slider({ value, min, max, step = 1, disabled, label, onChange }: SliderProps) {
  return (
    <input
      type="range"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full cursor-pointer accent-(--color-accent) disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}

/** Thin horizontal progress (timers, habits, StatCard). `value` 0..1. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn('h-1 overflow-hidden rounded-full bg-border-soft', className)}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
