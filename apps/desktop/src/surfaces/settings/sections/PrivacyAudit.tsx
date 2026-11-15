import { Download, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Badge, EmptyState } from '@/ui/data'
import { Button } from '@/ui/primitives'
import {
  filterAudit,
  MOCK_AUDIT,
  RESULT_LABEL,
  SOURCE_LABEL,
  type AuditFilter,
  type AuditResult,
} from './privacyModel'
import { toast, usePrefsSystem } from './prefsSystem'
import { Select } from './systemUi'
import { RISK_LABEL, type Risk } from './toolsModel'

const RISK_OPTIONS: { value: Risk | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os riscos' },
  { value: 'safe', label: RISK_LABEL.safe },
  { value: 'confirm', label: RISK_LABEL.confirm },
  { value: 'dangerous', label: RISK_LABEL.dangerous },
]

const RESULT_OPTIONS: { value: AuditResult | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os resultados' },
  { value: 'ok', label: 'Ok' },
  { value: 'denied', label: 'Negado' },
  { value: 'error', label: 'Erro' },
]

/** Recent tool calls with filters, export and retention. */
export function PrivacyAudit() {
  const [filter, setFilter] = useState<AuditFilter>({ risk: 'all', result: 'all' })
  const retention = usePrefsSystem((s) => s.auditRetention)
  const setRetention = usePrefsSystem((s) => s.setAuditRetention)
  const rows = filterAudit(MOCK_AUDIT, filter)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Filtrar por risco"
          value={filter.risk}
          options={RISK_OPTIONS}
          onChange={(risk) => setFilter((f) => ({ ...f, risk }))}
        />
        <Select
          label="Filtrar por resultado"
          value={filter.result}
          options={RESULT_OPTIONS}
          onChange={(result) => setFilter((f) => ({ ...f, result }))}
        />
        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted">
          Guardar por
          <Select
            label="Retenção do log de auditoria"
            value={retention}
            options={[
              { value: '7', label: '7 dias' },
              { value: '30', label: '30 dias' },
              { value: '90', label: '90 dias' },
            ]}
            onChange={setRetention}
          />
        </label>
        <Button
          size="sm"
          onClick={() => toast('Log exportado para Documentos\\ekko-auditoria.csv')}
        >
          <Download className="size-3.5" aria-hidden /> Exportar
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-soft">
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nada com esses filtros" />
        ) : (
          <table className="w-full text-left text-[12px]">
            <thead className="bg-surface">
              <tr className="label-hud">
                <th scope="col" className="px-3 py-2 font-normal">
                  Hora
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Função
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Detalhe
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Risco
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Resultado
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Origem
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border-soft hover:bg-surface-hover">
                  <td className="px-3 py-2 font-mono text-muted tabular-nums">{r.time}</td>
                  <td className="px-3 py-2 font-medium">{r.tool}</td>
                  <td className="max-w-40 truncate px-3 py-2 text-muted" title={r.detail}>
                    {r.detail}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={r.risk === 'dangerous' ? 'danger' : 'muted'}>
                      {RISK_LABEL[r.risk]}
                    </Badge>
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2',
                      r.result === 'ok' && 'text-accent',
                      r.result === 'denied' && 'text-muted',
                      r.result === 'error' && 'text-danger',
                    )}
                  >
                    {RESULT_LABEL[r.result]}
                  </td>
                  <td className="px-3 py-2 text-muted">{SOURCE_LABEL[r.source]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
