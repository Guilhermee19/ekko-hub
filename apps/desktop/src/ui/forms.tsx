import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface ToggleProps {
  checked: boolean
  label: string
  onChange: (v: boolean) => void
  disabled?: boolean
}

/** On/off switch. `label` is for screen readers; show visible text next to it. */
export function Toggle({ checked, label, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none disabled:opacity-40',
        checked ? 'border-accent/50 bg-accent/30' : 'border-border-soft bg-surface-hover',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-3.5 rounded-full transition-[left,background-color] duration-200 ease-out-soft',
          checked ? 'left-[18px] bg-accent' : 'left-0.5 bg-muted',
        )}
      />
    </button>
  )
}

/** Text field in the HUD style. Pass `aria-label` when there is no visible label. */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-border-soft bg-base/60 px-3 py-1.5 text-[13px] outline-none',
        'placeholder:text-muted focus:border-accent/50',
        className,
      )}
      {...props}
    />
  )
}

/** Round checkbox for task lists. */
export function Check({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors',
        checked
          ? 'border-accent bg-accent text-(--color-base)'
          : 'border-muted/60 hover:border-accent',
      )}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
          <path
            d="M2.5 6.2 5 8.5l4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
