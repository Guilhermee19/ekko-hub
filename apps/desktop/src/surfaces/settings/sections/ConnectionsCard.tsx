import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { Availability } from '@/lib/availability'
import { SoonTag } from '@/ui/Availability'
import { Button } from '@/ui/primitives'

interface ShellProps {
  icon: LucideIcon
  name: string
  description: string
  badge: ReactNode
  /** Extra line under the description (account, path…). */
  meta?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
}

/** Visual frame shared by every connection card. */
export function ConnectionsShell({
  icon: Icon,
  name,
  description,
  badge,
  meta,
  action,
  children,
  className,
}: ShellProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-medium">{name}</h3>
            {badge}
          </div>
          <p className="text-[12px] text-muted">{description}</p>
          {meta && <p className="mt-1 truncate font-mono text-[11px] text-muted">{meta}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </article>
  )
}

/** Not wired yet: lands with the F7 connectors. */
export const F7_SOON: Availability = { status: 'soon', phase: 'F7' }

/** Clearly-marked placeholder for services that arrive in F7 (Tuya, câmeras). */
export function SoonConnectionCard({
  icon,
  name,
  description,
}: {
  icon: LucideIcon
  name: string
  description: string
}) {
  return (
    <ConnectionsShell
      icon={icon}
      name={name}
      description={description}
      badge={<SoonTag availability={F7_SOON} />}
      action={
        <Button size="sm" variant="ghost" disabled>
          Conectar
        </Button>
      }
      className="opacity-70"
    >
      <p className="text-[12px] text-muted">Chega na F7.</p>
    </ConnectionsShell>
  )
}
