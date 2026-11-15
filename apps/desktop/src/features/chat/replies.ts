import type { ActionStatus } from './store'

// Canned replies for the F1b prototype: simple keyword matching, no real AI.

export interface CannedAction {
  tool: string
  detail: string
  status: ActionStatus
}

export interface CannedReply {
  action?: CannedAction
  text: string
}

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w))

export function pickReply(input: string, withScreenshot: boolean): CannedReply {
  const t = input.toLowerCase()

  if (withScreenshot || has(t, 'tela', 'print')) {
    return {
      action: { tool: 'screen.capture', detail: 'monitor 1', status: 'ok' },
      text: 'Vejo o VS Code aberto no ChatPage.tsx, com o terminal rodando o Vite na porta 1420 e o Spotify minimizado. Quer que eu explique algum trecho do código?',
    }
  }
  if (has(t, 'hora', 'horas')) {
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return { text: `Agora são ${now}. Quer que eu crie um lembrete para mais tarde?` }
  }
  if (has(t, 'timer', 'cronômetro', 'minutos')) {
    const min = t.match(/(\d+)\s*min/)?.[1] ?? '5'
    return {
      action: { tool: 'timer.start', detail: `${min} min`, status: 'ok' },
      text: `Pronto! Timer de ${min} minutos iniciado. Te aviso quando acabar.`,
    }
  }
  if (has(t, 'spotify', 'abre', 'abrir')) {
    return {
      action: { tool: 'app.open', detail: 'Spotify', status: 'confirm' },
      text: 'Posso abrir o Spotify? É só confirmar logo acima.',
    }
  }
  if (has(t, 'volume', 'som')) {
    const pct = t.match(/(\d+)/)?.[1] ?? '40'
    return {
      action: { tool: 'volume.set', detail: `${pct}%`, status: 'ok' },
      text: `Volume ajustado para ${pct}%.`,
    }
  }
  if (has(t, 'apaga', 'apague', 'deleta', 'excluir')) {
    return {
      action: { tool: 'files.delete', detail: 'Downloads/*.tmp', status: 'error' },
      text: 'Não consegui apagar: dois arquivos estão em uso por outro programa. Feche-os e tente de novo.',
    }
  }
  return {
    text: 'Entendi. Ainda estou no modo protótipo, então essa resposta é simulada, mas em breve vou conseguir te ajudar com isso de verdade.',
  }
}
