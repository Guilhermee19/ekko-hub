import { RotateCcw, TriangleExclamationPoint } from 'lucide-react'
import { useEffect } from 'react'
import type { ShortcutReport } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Badge } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { PageFrame } from './GeneralControls'
import { toast } from './prefsAssistant'
import { ComboCapture } from './ShortcutsCapture'
import { DEFAULT_SHORTCUTS, findConflicts, type ShortcutId } from './shortcutsCombo'
import { useShortcuts } from './shortcutsStore'

const ROWS: {
  id: ShortcutId
  title: string
  hint: string
  later?: string
  presets?: string[]
}[] = [
  { id: 'summon', title: 'Chamar o Ekko', hint: 'Abre o notch pronto para digitar.' },
  { id: 'palette', title: 'Paleta de comandos', hint: 'Busca rápida de ações e apps.' },
  {
    id: 'capture',
    title: 'Print de uma área',
    hint: 'Escolha um pedaço da tela; o print vai para o notch. Se o Print Screen não responder, desligue a captura de tela do Windows nessa tecla.',
    // Alt Gr = Ctrl+Alt on Windows.
    presets: ['Ctrl+Alt+PrintScreen', 'PrintScreen', 'Ctrl+Shift+S', 'Ctrl+Alt+P'],
  },
  { id: 'ptt', title: 'Apertar para falar', hint: 'Segure enquanto fala.', later: 'F3' },
  {
    id: 'selection',
    title: 'Ações no texto selecionado',
    hint: 'Traduzir, resumir, corrigir…',
    later: 'F6',
  },
  {
    id: 'dictation',
    title: 'Ditado',
    hint: 'Escreve o que você fala em qualquer campo.',
    later: 'F3',
  },
  { id: 'interrupt', title: 'Interromper fala', hint: 'Faz o Ekko parar de falar.', later: 'F3' },
]

/** Registration result next to the combo; nothing when it simply works. */
function StatusNote({ report, combo }: { report?: ShortcutReport; combo: string }) {
  if (!report) return null
  if (report.status === 'taken') return <Badge tone="danger">ocupado por outro app</Badge>
  if (report.status === 'invalid') return <Badge tone="danger">inválido</Badge>
  if (report.status === 'pending')
    return <span className="text-[11px] text-muted">salvo · ativa quando a função chegar</span>
  if (report.active && report.active.toLowerCase() !== combo.toLowerCase())
    return <span className="text-[11px] text-muted">em uso: {report.active}</span>
  return null
}

export function ShortcutsPage() {
  const shortcuts = useSettings((s) => s.settings.shortcuts)
  const { reports, saving, refresh, save, setShortcut } = useShortcuts()
  const conflicts = findConflicts(shortcuts)
  const changed = ROWS.some((r) => shortcuts[r.id] !== DEFAULT_SHORTCUTS[r.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const restoreAll = () => {
    void save(DEFAULT_SHORTCUTS).then(() => toast('Atalhos restaurados'))
  }

  return (
    <PageFrame title="Atalhos" subtitle="Atalhos globais: funcionam em qualquer app do Windows.">
      <Field
        title="Teclado"
        hint="Clique em Alterar e pressione a nova combinação (com Ctrl, Alt ou Win). Esc cancela."
      >
        {conflicts.size > 0 && (
          <p role="alert" className="mb-3 flex items-center gap-2 text-[12px] text-danger">
            <TriangleExclamationPoint className="size-4" aria-hidden /> Dois atalhos usam a mesma
            combinação. Troque um deles para os dois funcionarem.
          </p>
        )}
        <table className="w-full overflow-hidden rounded-xl border border-border-soft bg-surface text-left">
          <thead>
            <tr className="border-b border-border-soft">
              <th scope="col" className="label-hud px-3 py-2 font-normal">
                Ação
              </th>
              <th scope="col" className="label-hud px-3 py-2 font-normal">
                Atalho
              </th>
              <th scope="col" className="sr-only">
                Restaurar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft" aria-busy={saving}>
            {ROWS.map((r) => {
              const combo = shortcuts[r.id]
              const isDefault = combo === DEFAULT_SHORTCUTS[r.id]
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      {r.title}
                      {r.later && <Badge>chega na {r.later}</Badge>}
                      {conflicts.has(r.id) && <Badge tone="danger">conflito</Badge>}
                    </div>
                    <div className="text-[11px] text-muted">{r.hint}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      <ComboCapture
                        label={r.title}
                        combo={combo}
                        onChange={(c) => void setShortcut(r.id, c)}
                        presets={r.presets}
                      />
                      <StatusNote report={reports[r.id]} combo={combo} />
                    </div>
                  </td>
                  <td className="w-10 px-2 py-2.5">
                    <IconButton
                      label={`Restaurar padrão de ${r.title}`}
                      disabled={isDefault}
                      onClick={() => void setShortcut(r.id, DEFAULT_SHORTCUTS[r.id])}
                    >
                      <RotateCcw className="size-3.5" />
                    </IconButton>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" disabled={!changed || saving} onClick={restoreAll}>
            <RotateCcw className="size-4" aria-hidden /> Restaurar todos
          </Button>
        </div>
      </Field>
    </PageFrame>
  )
}
