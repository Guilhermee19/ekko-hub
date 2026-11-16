import { backend, type ProcessGroup, type ScanAction } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'
import { requestConfirm } from '@/stores/confirm'
import { formatBytes, killMessage } from './metrics'
import { useMyPc } from './store'

// Every PC-changing action goes through `requestConfirm`; the backend also refuses
// protected processes and writes the audit log.

const toast = (text: string) => useAssistant.getState().set({ toast: text })
const reason = (err: unknown) => (err instanceof Error ? err.message : String(err))

/** "Finalizar tarefa" for a whole group, or one `pid` of it. */
export async function endTask(group: ProcessGroup, pid?: number) {
  if (group.protection === 'protected') return
  const warn = group.protection === 'warn'
  const what = pid ? `o processo ${pid} de ${group.label}` : group.label
  const count = pid ? '' : group.count > 1 ? ` (${group.count} processos)` : ''
  const ok = await requestConfirm({
    title: `Finalizar ${what}?`,
    detail:
      `${group.name}${count}. O Ekko pede para fechar e, se não fechar em 3 s, encerra à força. ` +
      (warn
        ? 'É uma parte do Windows: a barra de tarefas ou outras janelas podem sumir e voltar sozinhas.'
        : 'O que não foi salvo nele pode ser perdido.'),
    tool: 'system.kill',
    risk: warn ? 'dangerous' : 'confirm',
    confirmLabel: 'Finalizar',
  })
  if (!ok) return
  try {
    const report = await backend.systemKill(pid ? { pid } : { name: group.name })
    toast(killMessage(group.label, report))
  } catch (err) {
    toast(`Não consegui finalizar ${group.label}: ${reason(err)}`)
  }
}

/** Runs a scan suggestion (after confirming the destructive ones). */
export async function applyAction(checkId: string, action: ScanAction) {
  const markApplied = () => useMyPc.getState().markApplied(checkId)
  try {
    if (action.kind === 'openStartup') {
      await backend.systemOpenStartupSettings()
      return
    }
    if (action.kind === 'cleanTemp') {
      const ok = await requestConfirm({
        title: `Limpar até ${formatBytes(action.bytes)} de temporários?`,
        detail:
          'Apaga só arquivos com mais de 24 h da sua pasta temporária. Arquivos em uso ficam onde estão.',
        tool: 'system.clean_temp',
        risk: 'confirm',
        confirmLabel: 'Limpar',
      })
      if (!ok) return
      const r = await backend.systemCleanTemp()
      markApplied()
      toast(
        `${formatBytes(r.freedBytes)} liberados` +
          (r.skippedFiles ? ` · ${r.skippedFiles} arquivos em uso ficaram` : ''),
      )
      return
    }
    const ok = await requestConfirm({
      title: `Esvaziar a lixeira (${formatBytes(action.bytes)})?`,
      detail: 'Os arquivos da lixeira de todos os discos serão apagados para sempre.',
      tool: 'system.empty_recycle_bin',
      risk: 'dangerous',
      confirmLabel: 'Esvaziar',
    })
    if (!ok) return
    const freed = await backend.systemEmptyRecycleBin()
    markApplied()
    toast(`Lixeira esvaziada · ${formatBytes(freed)} liberados`)
  } catch (err) {
    toast(`Não deu certo: ${reason(err)}`)
  }
}
