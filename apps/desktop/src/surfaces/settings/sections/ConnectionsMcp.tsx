import { Blocks, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge } from '@/ui/data'
import { Input } from '@/ui/forms'
import { Button, IconButton } from '@/ui/primitives'
import { ConnectionsShell } from './ConnectionsCard'
import { toast, usePrefsSystem } from './prefsSystem'
import { StatusDot } from './systemUi'

/** MCP servers: each one plugs its tools into Ekko (F7 MCP client). */
export function ConnectionsMcp() {
  const servers = usePrefsSystem((s) => s.mcpServers)
  const { addMcpServer, removeMcpServer } = usePrefsSystem.getState()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', command: '', args: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.command.trim()) return
    addMcpServer({ name: form.name.trim(), command: form.command.trim(), args: form.args.trim() })
    toast(`Servidor ${form.name.trim()} adicionado`)
    setForm({ name: '', command: '', args: '' })
    setAdding(false)
  }

  return (
    <ConnectionsShell
      icon={Blocks}
      name="Servidores MCP"
      description="Plugue qualquer servidor MCP e as ferramentas dele viram funções do Ekko."
      badge={<Badge tone="accent">{servers.filter((s) => s.running).length} ativos</Badge>}
      action={
        !adding && (
          <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" aria-hidden /> Adicionar
          </Button>
        )
      }
    >
      <ul className="divide-y divide-border-soft rounded-lg border border-border-soft bg-base/40">
        {servers.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2">
            <StatusDot tone={s.running ? 'on' : 'off'} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{s.name}</div>
              <div
                className="truncate font-mono text-[11px] text-muted"
                title={`${s.command} ${s.args}`}
              >
                {s.command} {s.args}
              </div>
            </div>
            <span className="text-[11px] text-muted">
              {s.running ? `${s.tools} ferramentas` : 'Parado'}
            </span>
            <IconButton label={`Remover ${s.name}`} onClick={() => removeMcpServer(s.id)}>
              <Trash2 className="size-3.5" />
            </IconButton>
          </li>
        ))}
        {servers.length === 0 && (
          <li className="px-3 py-3 text-[12px] text-muted">Nenhum servidor ainda.</li>
        )}
      </ul>

      {adding && (
        <form
          onSubmit={submit}
          className="grid grid-cols-[1fr_1fr_2fr] gap-2"
          aria-label="Novo servidor MCP"
        >
          <Input
            aria-label="Nome do servidor"
            placeholder="Nome (ex.: github)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <Input
            aria-label="Comando"
            placeholder="Comando (ex.: npx)"
            value={form.command}
            onChange={(e) => setForm({ ...form, command: e.target.value })}
            className="font-mono"
          />
          <Input
            aria-label="Argumentos"
            placeholder="Argumentos"
            value={form.args}
            onChange={(e) => setForm({ ...form, args: e.target.value })}
            className="font-mono"
          />
          <div className="col-span-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Adicionar servidor
            </Button>
          </div>
        </form>
      )}
    </ConnectionsShell>
  )
}
