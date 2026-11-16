import { Fan, House, Lightbulb, LoaderCircle, Power, RefreshCw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useHomeAssistant } from '@/features/integrations/homeAssistant'
import type { HaEntity } from '@/lib/ipc'
import { Badge } from '@/ui/data'
import { Input, Toggle } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { ConnectionsShell } from './ConnectionsCard'
import { Step } from './ConnectionsOAuth'
import { HOME_ASSISTANT_STEPS } from './oauthGuides'
import { toast } from './prefsSystem'

/** Real Home Assistant card: URL + long-lived token, then lights/switches/fans to toggle. */
export function HomeAssistantCard() {
  const status = useHomeAssistant((s) => s.status)
  const busy = useHomeAssistant((s) => s.busy)
  const error = useHomeAssistant((s) => s.error)
  const [open, setOpen] = useState(false)
  const expanded = !status.connected && (open || busy || Boolean(status.url))

  useEffect(() => {
    void useHomeAssistant.getState().refresh()
  }, [])

  const disconnect = async () => {
    await useHomeAssistant.getState().disconnect()
    setOpen(false)
    toast('Home Assistant desconectado')
  }

  const meta = status.connected
    ? [status.locationName, status.version && `v${status.version}`, status.url]
        .filter(Boolean)
        .join(' · ')
    : undefined

  return (
    <ConnectionsShell
      className={expanded || status.connected ? 'col-span-2' : undefined}
      icon={House}
      name="Home Assistant"
      description="Ligue e desligue luzes, tomadas e ventiladores do seu Home Assistant."
      meta={meta}
      badge={
        status.connected ? (
          <Badge tone="accent">Conectado</Badge>
        ) : busy ? (
          <Badge>Testando…</Badge>
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
            {HOME_ASSISTANT_STEPS.map((step, i) => (
              <Step key={step.text} index={i + 1} step={step} />
            ))}
          </ol>
          <HaForm
            key={`${status.url ?? ''}:${status.hasToken}`}
            url={status.url ?? ''}
            hasToken={status.hasToken}
            busy={busy}
            onCancel={status.url ? () => void disconnect() : () => setOpen(false)}
            cancelLabel={status.url ? 'Esquecer' : 'Cancelar'}
          />
          <p className="text-[11px] text-muted">
            Funciona com endereço local (ex.: http://192.168.0.10:8123) ou Nabu Casa. O token fica
            no Gerenciador de Credenciais do Windows.
          </p>
        </div>
      )}
      {error && !busy && <p className="text-[12px] text-danger">{error}</p>}
      {status.connected && <EntityList />}
    </ConnectionsShell>
  )
}

interface FormProps {
  url: string
  hasToken: boolean
  busy: boolean
  onCancel: () => void
  cancelLabel: string
}

function HaForm({ url: savedUrl, hasToken, busy, onCancel, cancelLabel }: FormProps) {
  const [url, setUrl] = useState(savedUrl || 'http://homeassistant.local:8123')
  const [token, setToken] = useState('')
  const canSubmit = url.trim().length > 0 && (hasToken || token.trim().length > 0) && !busy

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (await useHomeAssistant.getState().save(url, token)) toast('Home Assistant conectado')
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-[12px]">
        <span className="font-medium">Endereço</span>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://homeassistant.local:8123"
          spellCheck={false}
          autoComplete="off"
          className="font-mono"
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px]">
        <span className="font-medium">Token de acesso de longa duração</span>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={hasToken ? 'salvo no Gerenciador de Credenciais' : 'cole aqui o token'}
          autoComplete="off"
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button size="sm" variant="primary" type="submit" disabled={!canSubmit}>
          {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
          Testar conexão
        </Button>
      </div>
    </form>
  )
}

const ICONS = { light: Lightbulb, fan: Fan } as Record<string, typeof Power>

function EntityList() {
  const entities = useHomeAssistant((s) => s.entities)
  const pending = useHomeAssistant((s) => s.pending)
  const { loadEntities, toggle } = useHomeAssistant.getState()

  return (
    <div className="flex flex-col gap-2 border-t border-border-soft pt-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium">Luzes, tomadas e ventiladores</span>
        <IconButton label="Atualizar lista" onClick={() => void loadEntities()}>
          <RefreshCw className="size-3.5" aria-hidden />
        </IconButton>
      </div>
      {entities.length === 0 ? (
        <p className="text-[12px] text-muted">Nenhuma luz, tomada ou ventilador encontrado.</p>
      ) : (
        <ul className="grid max-h-64 grid-cols-2 gap-x-4 overflow-y-auto rounded-lg border border-border-soft bg-base/40 px-3 py-1">
          {entities.map((e) => (
            <EntityRow
              key={e.entityId}
              entity={e}
              pending={pending.includes(e.entityId)}
              onToggle={() => void toggle(e.entityId)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function EntityRow({
  entity,
  pending,
  onToggle,
}: {
  entity: HaEntity
  pending: boolean
  onToggle: () => void
}) {
  const Icon = ICONS[entity.domain] ?? Power
  const unavailable = entity.state === 'unavailable' || entity.state === 'unknown'
  return (
    <li className="flex items-center gap-2 py-1.5">
      <Icon
        className={entity.state === 'on' ? 'size-3.5 text-accent' : 'size-3.5 text-muted'}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-[12px]" title={entity.entityId}>
        {entity.name}
      </span>
      {unavailable && <span className="text-[11px] text-muted">indisponível</span>}
      <Toggle
        checked={entity.state === 'on'}
        label={`Ligar ou desligar ${entity.name}`}
        disabled={pending || unavailable}
        onChange={onToggle}
      />
    </li>
  )
}
