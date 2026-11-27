import { ExternalLink, MailX, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useIntegrations } from '@/features/integrations/store'
import { backend, type MailMessage } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useNow } from '@/surfaces/shared/useNow'
import { EmptyState, PageHeader } from '@/ui/data'
import { Button, IconButton, Segmented } from '@/ui/primitives'
import { receivedLabel, unreadCount } from './mail'
import { openMail, refreshMail, useMail } from './store'

type Filter = 'unread' | 'all'

/** Inbox of the connected Gmail and Outlook accounts, read-only: "Ver" opens the web app. */
export function MailPage() {
  const messages = useMail((s) => s.messages)
  const gmail = useIntegrations((s) => s.status.gmail.connected)
  const outlook = useIntegrations((s) => s.status.outlook.connected)
  const [filter, setFilter] = useState<Filter>('unread')
  const now = useNow(true, 30_000)

  useEffect(() => {
    void useIntegrations.getState().refresh()
  }, [])

  const connected = gmail || outlook
  const unread = unreadCount(messages)
  const shown = filter === 'unread' ? messages.filter((m) => m.unread) : messages

  return (
    <div className="animate-rise-in flex flex-col gap-3">
      <PageHeader
        title="E-mail"
        hint={
          connected
            ? unread
              ? `${unread} não ${unread === 1 ? 'lido' : 'lidos'}`
              : 'Tudo lido por aqui'
            : 'Nenhuma conta conectada'
        }
        actions={
          connected && (
            <IconButton label="Procurar e-mails novos" onClick={refreshMail}>
              <RefreshCw className="size-4" aria-hidden />
            </IconButton>
          )
        }
      />
      {!connected ? (
        <Disconnected />
      ) : (
        <>
          <div>
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'unread', label: 'Não lidos' },
                { value: 'all', label: 'Todos' },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <EmptyState
              icon={MailX}
              title={filter === 'unread' ? 'Nenhum e-mail não lido' : 'Caixa de entrada vazia'}
              hint="O Ekko olha a caixa de entrada a cada minuto e avisa no notch quando chega algo."
            />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {shown.map((m) => (
                <MailRow key={`${m.provider}:${m.id}`} message={m} now={now} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function MailRow({ message: m, now }: { message: MailMessage; now: number }) {
  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border px-3 py-2.5',
        m.unread ? 'border-border-soft bg-surface' : 'border-transparent',
        m.quiet && 'opacity-70',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          m.unread ? 'bg-accent' : 'bg-transparent',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn('min-w-0 flex-1 truncate text-[13px]', m.unread && 'font-semibold')}
            title={m.fromAddr}
          >
            {m.fromName}
          </span>
          <span className="shrink-0 text-[11px] text-muted tabular-nums">
            {receivedLabel(m.receivedMs, now)}
          </span>
        </div>
        <div className={cn('truncate text-[13px]', m.unread ? 'text-content' : 'text-muted')}>
          {m.subject}
        </div>
        {m.snippet && <div className="truncate text-[12px] text-muted">{m.snippet}</div>}
        <div className="mt-1 truncate text-[11px] text-muted">
          {m.provider === 'gmail' ? 'Gmail' : 'Outlook'} · {m.account}
          {m.quiet && ' · promoção'}
        </div>
      </div>
      <Button size="sm" variant="subtle" onClick={() => openMail(m)}>
        <ExternalLink className="size-3.5" aria-hidden /> Ver
      </Button>
    </li>
  )
}

function Disconnected() {
  return (
    <div className="flex flex-col items-center gap-3">
      <EmptyState
        icon={MailX}
        title="Conecte o Gmail ou o Outlook"
        hint="Em Configurações → Conexões. O Ekko só lê a caixa de entrada e avisa quando chega e-mail novo."
      />
      <Button variant="primary" onClick={() => void backend.openSettings()}>
        Abrir Conexões
      </Button>
    </div>
  )
}
