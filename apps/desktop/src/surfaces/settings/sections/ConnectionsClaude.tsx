import { Code, ExternalLink, LoaderCircle, Send } from 'lucide-react'
import { useEffect } from 'react'
import { create } from 'zustand'
import { errorText } from '@/features/integrations/store'
import { backend, type ClaudeCodeStatus } from '@/lib/ipc'
import { SoonTag } from '@/ui/Availability'
import { Badge } from '@/ui/data'
import { Button } from '@/ui/primitives'
import { ConnectionsShell, F7_SOON } from './ConnectionsCard'

const INSTALL_DOCS = 'https://docs.claude.com/en/docs/claude-code/setup'

interface ClaudeState {
  status: ClaudeCodeStatus | null
  checking: boolean
  error: string | null
  check: () => Promise<void>
}

const useClaudeCode = create<ClaudeState>((set, get) => ({
  status: null,
  checking: false,
  error: null,
  check: async () => {
    if (get().checking) return
    set({ checking: true, error: null })
    try {
      set({ status: await backend.claudeCodeStatus() })
    } catch (err) {
      set({ error: errorText(err) })
    } finally {
      set({ checking: false })
    }
  },
}))

/** Detects the Claude Code CLI (PATH + usual install dirs) and shows its version. */
export function ConnectionsClaudeCard() {
  const status = useClaudeCode((s) => s.status)
  const checking = useClaudeCode((s) => s.checking)
  const error = useClaudeCode((s) => s.error)

  useEffect(() => {
    void useClaudeCode.getState().check()
  }, [])

  const found = status?.found ?? false
  return (
    <ConnectionsShell
      icon={Code}
      name="Claude Code"
      description="Mandar tarefas pesadas de código para o Claude Code."
      badge={
        status === null ? (
          <Badge>Procurando…</Badge>
        ) : found ? (
          <Badge tone="accent">Encontrado</Badge>
        ) : (
          <Badge>Não encontrado</Badge>
        )
      }
      meta={found ? <span title={status?.path ?? ''}>{status?.path}</span> : undefined}
      action={
        <Button
          size="sm"
          variant="ghost"
          disabled={checking}
          onClick={() => void useClaudeCode.getState().check()}
        >
          {checking && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
          Verificar de novo
        </Button>
      }
    >
      {found && status?.version && (
        <p className="text-[12px] text-muted">Versão {status.version}</p>
      )}
      {status && !found && (
        <p className="text-[12px] text-muted">
          Não achei o comando <code className="font-mono">claude</code> no PATH nem nas pastas de
          instalação comuns.{' '}
          <button
            type="button"
            className="inline-flex items-center gap-1 text-accent hover:underline"
            onClick={() => void backend.openExternal(INSTALL_DOCS)}
          >
            Como instalar <ExternalLink className="size-3" aria-hidden />
          </button>
        </p>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <div className="flex items-center gap-2 rounded-lg border border-border-soft bg-base/40 px-3 py-2 opacity-60">
        <Send className="size-3.5 text-muted" aria-hidden />
        <span className="flex-1 text-[12px]">Enviar tarefa pesada para o Claude Code</span>
        <SoonTag availability={F7_SOON} />
      </div>
    </ConnectionsShell>
  )
}
