import { RotateCcw, TriangleExclamationPoint } from 'lucide-react'
import { Badge } from '@/ui/data'
import { Button, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { PageFrame } from './GeneralControls'
import { toast, usePrefs } from './prefsAssistant'
import { ComboCapture } from './ShortcutsCapture'
import { DEFAULT_SHORTCUTS, findConflicts, type ShortcutId } from './shortcutsCombo'

const ROWS: { id: ShortcutId; title: string; hint: string }[] = [
  { id: 'summon', title: 'Chamar o Ekko', hint: 'Abre o notch pronto para digitar.' },
  { id: 'palette', title: 'Paleta de comandos', hint: 'Busca rápida de ações e apps.' },
  { id: 'ptt', title: 'Apertar para falar', hint: 'Segure enquanto fala.' },
  { id: 'selection', title: 'Ações no texto selecionado', hint: 'Traduzir, resumir, corrigir…' },
  { id: 'dictation', title: 'Ditado', hint: 'Escreve o que você fala em qualquer campo.' },
  { id: 'interrupt', title: 'Interromper fala', hint: 'Faz o Ekko parar de falar.' },
]

export function ShortcutsPage() {
  const shortcuts = usePrefs((s) => s.shortcuts)
  const setShortcut = usePrefs((s) => s.setShortcut)
  const conflicts = findConflicts(shortcuts)
  const changed = ROWS.some((r) => shortcuts[r.id] !== DEFAULT_SHORTCUTS[r.id])

  const restoreAll = () => {
    ROWS.forEach((r) => setShortcut(r.id, DEFAULT_SHORTCUTS[r.id]))
    toast('Atalhos restaurados')
  }

  return (
    <PageFrame title="Atalhos" subtitle="Atalhos globais: funcionam em qualquer app do Windows.">
      <Field title="Teclado" hint="Clique em Alterar e pressione a nova combinação. Esc cancela.">
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
          <tbody className="divide-y divide-border-soft">
            {ROWS.map((r) => {
              const isDefault = shortcuts[r.id] === DEFAULT_SHORTCUTS[r.id]
              return (
                <tr key={r.id}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-[13px]">
                      {r.title}
                      {conflicts.has(r.id) && <Badge tone="danger">conflito</Badge>}
                    </div>
                    <div className="text-[11px] text-muted">{r.hint}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <ComboCapture
                      label={r.title}
                      combo={shortcuts[r.id]}
                      onChange={(c) => setShortcut(r.id, c)}
                    />
                  </td>
                  <td className="w-10 px-2 py-2.5">
                    <IconButton
                      label={`Restaurar padrão de ${r.title}`}
                      disabled={isDefault}
                      onClick={() => setShortcut(r.id, DEFAULT_SHORTCUTS[r.id])}
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
          <Button variant="ghost" disabled={!changed} onClick={restoreAll}>
            <RotateCcw className="size-4" aria-hidden /> Restaurar todos
          </Button>
        </div>
      </Field>
    </PageFrame>
  )
}
