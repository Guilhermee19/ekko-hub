import { AlertTriangle, Check, Cog, ShieldQuestion, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAssistant } from '@/stores/assistant'
import { EkkoFace } from '@/ui/EkkoFace'
import { useChat, type ActionStatus, type Message } from './store'

type Of<R extends Message['role']> = Extract<Message, { role: R }>

/** Fake "print da tela" thumbnail: a gradient stand-in until real capture lands. */
export function ScreenshotThumb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md border border-white/20 bg-linear-to-br from-accent/50 via-surface to-base',
        className,
      )}
    >
      <span className="absolute top-1 left-1 h-1 w-1/3 rounded-full bg-white/40" />
      <span className="absolute top-3 left-1 h-1 w-1/2 rounded-full bg-white/25" />
      <span className="absolute right-1 bottom-1 size-3 rounded-sm bg-accent/60" />
    </div>
  )
}

export function UserBubble({ message }: { message: Of<'user'> }) {
  return (
    <div className="animate-rise-in flex justify-end pl-10">
      <div className="max-w-full rounded-2xl rounded-br-md bg-accent-strong px-3 py-2 text-[13px] text-white">
        {message.screenshot && (
          <div className="mb-1.5 flex items-center gap-2">
            <ScreenshotThumb className="h-12 w-20" />
            <span className="text-[11px] text-white/80">print da tela</span>
          </div>
        )}
        <p className="break-words whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  )
}

export function AssistantBubble({ message }: { message: Of<'assistant'> }) {
  const phase = useAssistant((s) => s.phase)
  return (
    <div className="animate-rise-in flex items-end gap-2 pr-10">
      <EkkoFace phase={message.streaming ? phase : 'idle'} className="size-6 shrink-0" />
      <div className="max-w-full rounded-2xl rounded-bl-md border border-border-soft bg-surface px-3 py-2 text-[13px]">
        <p className="break-words whitespace-pre-wrap">
          {message.text}
          {message.streaming && (
            <span
              aria-hidden
              className="animate-hud-breathe ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 bg-accent"
            />
          )}
        </p>
        {message.stopped && <p className="mt-1 text-[11px] text-muted">Interrompido</p>}
      </div>
    </div>
  )
}

const STATUS: Record<ActionStatus, { icon: LucideIcon; label: string; tone: string }> = {
  ok: { icon: Check, label: 'ok', tone: 'text-accent' },
  confirm: { icon: ShieldQuestion, label: 'precisa confirmar', tone: 'text-content' },
  error: { icon: AlertTriangle, label: 'erro', tone: 'text-danger' },
  cancelled: { icon: X, label: 'cancelado', tone: 'text-muted' },
}

/** Jarvis-style audit row for a tool call, inline in the conversation. */
export function ActionRow({ message }: { message: Of<'action'> }) {
  const resolve = useChat((s) => s.resolveAction)
  const st = STATUS[message.status]
  const StatusIcon = st.icon
  const pending = message.status === 'confirm'
  return (
    <div
      className={cn(
        'animate-fade-in ml-8 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] tabular-nums',
        pending ? 'border-accent/40 bg-accent/5' : 'border-border-soft/70 bg-base/40',
        message.status === 'error' && 'border-danger/30',
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5 text-muted">
        <Cog
          className={cn('size-3 shrink-0', pending && 'animate-hud-fast text-accent')}
          aria-hidden
        />
        <span className="truncate text-content">{message.tool}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{message.detail}</span>
        <span aria-hidden>·</span>
        <span className={cn('flex shrink-0 items-center gap-1', st.tone)}>
          <StatusIcon className="size-3" aria-hidden />
          {st.label}
        </span>
      </div>
      {pending && (
        <div className="mt-1.5 flex gap-1.5 font-sans">
          <SmallButton primary onClick={() => resolve(message.id, true)}>
            Confirmar
          </SmallButton>
          <SmallButton onClick={() => resolve(message.id, false)}>Cancelar</SmallButton>
        </div>
      )}
    </div>
  )
}

interface SmallButtonProps {
  primary?: boolean
  onClick: () => void
  children: string
}

function SmallButton({ primary, onClick, children }: SmallButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-colors',
        'focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none',
        primary
          ? 'bg-accent-strong text-white hover:brightness-110'
          : 'text-muted hover:bg-surface-hover hover:text-content',
      )}
    >
      {children}
    </button>
  )
}
