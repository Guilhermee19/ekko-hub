import { Copy, ExternalLink, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { backend } from '@/lib/ipc'
import { useIntegrations } from '@/features/integrations/store'
import { Badge } from '@/ui/data'
import { Input } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { ConnectionsShell } from './ConnectionsCard'
import type { GuideStep, OAuthGuide } from './oauthGuides'
import { toast } from './prefsSystem'

/** Real OAuth card: guide + client ID form while disconnected, account when connected. */
export function OAuthConnectionCard({ guide }: { guide: OAuthGuide }) {
  const status = useIntegrations((s) => s.status[guide.provider])
  const connecting = useIntegrations((s) => s.connecting === guide.provider)
  const error = useIntegrations((s) => s.error[guide.provider])
  const [open, setOpen] = useState(false)
  const expanded = !status.connected && (open || connecting)

  const disconnect = async () => {
    await useIntegrations.getState().disconnect(guide.provider)
    toast(`${guide.name} desconectado`)
  }

  return (
    <ConnectionsShell
      className={expanded ? 'col-span-2' : undefined}
      icon={guide.icon}
      name={guide.name}
      description={guide.description}
      meta={status.connected ? `conectado como ${status.account ?? 'sua conta'}` : undefined}
      badge={
        status.connected ? (
          <Badge tone="accent">Conectado</Badge>
        ) : connecting ? (
          <Badge>Conectando…</Badge>
        ) : (
          <Badge>Não conectado</Badge>
        )
      }
      action={
        status.connected ? (
          <Button size="sm" variant="ghost" onClick={() => void disconnect()}>
            Desconectar
          </Button>
        ) : (
          !expanded && (
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              Configurar
            </Button>
          )
        )
      }
    >
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border-soft pt-3">
          <ol className="flex flex-col gap-2">
            {guide.steps.map((step, i) => (
              <Step key={step.text} index={i + 1} step={step} />
            ))}
          </ol>
          <ClientForm
            key={`${status.clientId ?? ''}:${status.hasSecret}`}
            guide={guide}
            clientId={status.clientId ?? ''}
            hasSecret={status.hasSecret}
            connecting={connecting}
            onCancel={() => setOpen(false)}
          />
          {connecting && (
            <p className="text-[12px] text-muted">
              Abri o navegador. Autorize o Ekko por lá; espero até 3 minutos.
            </p>
          )}
          {error && !connecting && <p className="text-[12px] text-danger">{error}</p>}
          <p className="text-[11px] text-muted">{guide.note}</p>
        </div>
      )}
      {status.connected && error && <p className="text-[12px] text-danger">{error}</p>}
    </ConnectionsShell>
  )
}

function Step({ index, step }: { index: number; step: GuideStep }) {
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast('Copiado')
    } catch {
      toast('Não consegui copiar; selecione e copie à mão')
    }
  }
  return (
    <li className="flex gap-2.5 text-[12px]">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-semibold text-accent">
        {index}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p>{step.text}</p>
        {step.link && (
          <button
            type="button"
            className="inline-flex w-fit items-center gap-1 text-accent hover:underline"
            onClick={() => void backend.openExternal(step.link?.url ?? '')}
          >
            {step.link.label} <ExternalLink className="size-3" aria-hidden />
          </button>
        )}
        {step.copy && (
          <div className="flex items-center gap-1">
            <code className="flex-1 truncate rounded-md border border-border-soft bg-base/60 px-2 py-1 font-mono text-[12px] select-all">
              {step.copy}
            </code>
            <IconButton label="Copiar" onClick={() => void copy(step.copy ?? '')}>
              <Copy className="size-3.5" aria-hidden />
            </IconButton>
          </div>
        )}
      </div>
    </li>
  )
}

interface FormProps {
  guide: OAuthGuide
  clientId: string
  hasSecret: boolean
  connecting: boolean
  onCancel: () => void
}

function ClientForm({ guide, clientId, hasSecret, connecting, onCancel }: FormProps) {
  const [id, setId] = useState(clientId)
  const [secret, setSecret] = useState('')
  const missingSecret = guide.needsSecret && !hasSecret && !secret.trim()
  const canSubmit = id.trim().length > 0 && !missingSecret && !connecting

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const store = useIntegrations.getState()
    await store.setClient(guide.provider, id, guide.needsSecret ? secret : undefined)
    if (await store.connect(guide.provider)) toast(`${guide.name} conectado`)
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[12px]">
        <span className="font-medium">Client ID</span>
        <Input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="cole aqui o Client ID"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {guide.needsSecret && (
        <label className="flex flex-col gap-1 text-[12px]">
          <span className="font-medium">Client secret</span>
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={
              hasSecret ? 'salvo no Gerenciador de Credenciais' : 'cole aqui o Client secret'
            }
            autoComplete="off"
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={connecting}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" type="submit" disabled={!canSubmit}>
          {connecting && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
          Conectar
        </Button>
      </div>
    </form>
  )
}
