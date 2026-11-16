import { Blocks, Plus, Trash2 } from 'lucide-react'
import { SoonTag } from '@/ui/Availability'
import { Button, IconButton } from '@/ui/primitives'
import { ConnectionsShell, F7_SOON } from './ConnectionsCard'
import { usePrefsSystem } from './prefsSystem'
import { StatusDot } from './systemUi'

/** MCP servers (F7 MCP client). Read-only preview until then: the list is sample data. */
export function ConnectionsMcp() {
  const servers = usePrefsSystem((s) => s.mcpServers)

  return (
    <ConnectionsShell
      icon={Blocks}
      name="Servidores MCP"
      description="Plugue qualquer servidor MCP e as ferramentas dele viram funções do Ekko."
      badge={<SoonTag availability={F7_SOON} />}
      action={
        <Button size="sm" variant="ghost" disabled>
          <Plus className="size-3.5" aria-hidden /> Adicionar
        </Button>
      }
    >
      <p className="text-[12px] text-muted">
        Chega na F7. Por enquanto, a lista abaixo é um exemplo.
      </p>
      <ul
        className="divide-y divide-border-soft rounded-lg border border-border-soft bg-base/40 opacity-60"
        aria-label="Servidores MCP de exemplo"
      >
        {servers.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2">
            <StatusDot tone="off" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">{s.name}</div>
              <div
                className="truncate font-mono text-[11px] text-muted"
                title={`${s.command} ${s.args}`}
              >
                {s.command} {s.args}
              </div>
            </div>
            <IconButton label={`Remover ${s.name}`} disabled>
              <Trash2 className="size-3.5" />
            </IconButton>
          </li>
        ))}
      </ul>
    </ConnectionsShell>
  )
}
