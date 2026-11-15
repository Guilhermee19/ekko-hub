import { KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Input } from '@/ui/forms'
import { Button } from '@/ui/primitives'
import { maskKey, type Provider } from './brainCatalog'
import { Select } from './GeneralControls'
import { toast, usePrefs } from './prefsAssistant'

/** One paid/free provider: masked API key, model and whether it is the active one. */
export function BrainProviderCard({ provider }: { provider: Provider }) {
  const brain = usePrefs((s) => s.brain)
  const patch = usePrefs((s) => s.patch)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const key = brain.keys[provider.id]
  const active = brain.provider === provider.id
  const id = `key-${provider.id}`

  const save = () => {
    if (!draft.trim()) return
    patch('brain', { keys: { ...brain.keys, [provider.id]: draft.trim() } })
    setDraft('')
    setEditing(false)
    toast(`Chave do ${provider.name} salva no Cofre do Windows`)
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-surface p-3 transition-colors',
        active ? 'border-accent/60' : 'border-border-soft',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-medium">{provider.name}</div>
          <div className="text-[11px] text-muted">{provider.vendor}</div>
        </div>
        <Badge tone={key ? 'accent' : 'muted'}>{key ? 'conectado' : 'sem chave'}</Badge>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="label-hud">
          Chave da API
        </label>
        {key && !editing ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate font-mono text-[12px] text-muted">
              {maskKey(key, provider.keyPrefix)}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} id={id}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={`${provider.keyPrefix}…`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <Button size="sm" variant="primary" disabled={!draft.trim()} onClick={save}>
              <KeyRound className="size-3.5" /> Salvar
            </Button>
          </div>
        )}
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <ShieldCheck className="size-3" aria-hidden /> Salvar no Cofre do Windows: a chave nunca
          fica em arquivo.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          aria-label={`Modelo do ${provider.name}`}
          value={brain.models[provider.id]}
          onChange={(e) =>
            patch('brain', { models: { ...brain.models, [provider.id]: e.target.value } })
          }
        >
          {provider.models.map((m) => (
            <option key={m} value={m} className="bg-surface">
              {m}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant={active ? 'ghost' : 'subtle'}
          disabled={active}
          className="shrink-0"
          onClick={() => patch('brain', { provider: provider.id })}
        >
          {active ? 'Em uso' : 'Usar este'}
        </Button>
      </div>
    </div>
  )
}
