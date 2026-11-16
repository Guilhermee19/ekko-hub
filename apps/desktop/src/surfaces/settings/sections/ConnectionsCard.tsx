import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { usePrefsSystem, type ConnId } from './prefsSystem'

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

interface OAuthProps {
  id: ConnId
  icon: LucideIcon
  name: string
  description: string
  phase: string
  /** Shown while connected (account e-mail, user…). */
  account?: string
}

/** Mock connect / disconnect card for services not wired yet (Tuya, Home Assistant,
 * câmeras). Real OAuth services use `OAuthConnectionCard`. */
export function ConnectionsCard({ id, icon, name, description, phase, account }: OAuthProps) {
  const status = usePrefsSystem((s) => s.connections[id])
  const { connect, disconnect } = usePrefsSystem.getState()
  const connected = status === 'connected'

  return (
    <ConnectionsShell
      icon={icon}
      name={name}
      description={description}
      meta={connected ? account : undefined}
      badge={
        connected ? (
          <Badge tone="accent">Conectado</Badge>
        ) : (
          <Badge>{status === 'connecting' ? 'Conectando…' : `Chega na ${phase}`}</Badge>
        )
      }
      action={
        connected ? (
          <Button size="sm" variant="ghost" onClick={() => disconnect(id)}>
            Desconectar
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            disabled={status === 'connecting'}
            onClick={() => connect(id)}
          >
            {status === 'connecting' && (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
            )}
            Conectar
          </Button>
        )
      }
    />
  )
}
