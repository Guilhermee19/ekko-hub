import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/data'
import { Toggle } from '@/ui/forms'
import { usePrefsSystem } from './prefsSystem'
import { Select } from './systemUi'
import {
  allowedOverrides,
  effectivePermission,
  RISK_LABEL,
  type ToolInfo,
  type ToolOverride,
} from './toolsModel'

const OVERRIDE_LABEL: Record<ToolOverride, string> = {
  default: 'Padrão',
  always: 'Sempre perguntar',
  never: 'Nunca perguntar',
}

/** One tool in the catalog: what it does, its risk and how Ekko treats it. */
export function ToolsCard({ tool, icon: Icon }: { tool: ToolInfo; icon: LucideIcon }) {
  const autonomy = usePrefsSystem((s) => s.autonomy)
  const enabled = usePrefsSystem((s) => s.toolEnabled[tool.id] ?? true)
  const override = usePrefsSystem((s) => s.toolOverride[tool.id] ?? 'default')
  const { setToolEnabled, setToolOverride } = usePrefsSystem.getState()
  const decision = effectivePermission(autonomy, tool.risk, override)

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border-soft bg-surface p-3 transition-opacity',
        !enabled && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium">{tool.name}</span>
            <Badge>{tool.phase}</Badge>
          </div>
          <p className="truncate text-[12px] text-muted">“{tool.example}”</p>
        </div>
        <Toggle
          checked={enabled}
          label={`Ativar ${tool.name}`}
          onChange={(on) => setToolEnabled(tool.id, on)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Badge
          tone={tool.risk === 'dangerous' ? 'danger' : tool.risk === 'confirm' ? 'accent' : 'muted'}
        >
          {RISK_LABEL[tool.risk]}
        </Badge>
        <span className="text-[11px] text-muted">
          {enabled ? (decision === 'run' ? 'Roda direto' : 'Pergunta antes') : 'Desativada'}
        </span>
        <Select
          className="ml-auto"
          label={`Confirmação de ${tool.name}`}
          value={override}
          options={allowedOverrides(tool.risk).map((o) => ({ value: o, label: OVERRIDE_LABEL[o] }))}
          onChange={(o) => setToolOverride(tool.id, o)}
        />
      </div>
    </div>
  )
}
