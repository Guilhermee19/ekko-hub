import {
  AppWindow,
  Blocks,
  Bell,
  Calculator,
  CalendarDays,
  Cctv,
  CircleX,
  Clipboard,
  Clock,
  CloudSun,
  Code,
  FolderTree,
  KeyRound,
  Lamp,
  Languages,
  LayoutGrid,
  ListTodo,
  Mic,
  Mouse,
  Music,
  Newspaper,
  Power,
  Repeat,
  ScanEye,
  SquareTerminal,
  Timer,
  TrendingUp,
  Volume2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import type { Risk, ToolCategory, ToolInfo } from './toolsModel'

// Mock catalog for F1c; F4+ reads it from the `ekko-tools` registry.
type Row = [id: string, name: string, example: string, risk: Risk, phase: string, icon: LucideIcon]

const ROWS: Record<ToolCategory, Row[]> = {
  basic: [
    ['time', 'Hora e data', 'Que horas são?', 'safe', 'F4', Clock],
    ['timer', 'Timer', 'Ei Ekko, timer de 5 minutos', 'safe', 'F4', Timer],
    ['calc', 'Calculadora', 'Quanto é 15% de 320?', 'safe', 'F4', Calculator],
    ['weather', 'Clima', 'Vai chover amanhã?', 'safe', 'F4', CloudSun],
    ['quotes', 'Cotações', 'Quanto está o dólar?', 'safe', 'F4', TrendingUp],
    ['news', 'Notícias', 'Me dá as notícias de hoje', 'safe', 'F4', Newspaper],
    ['translate', 'Tradução', 'Como se diz "saudade" em inglês?', 'safe', 'F4', Languages],
    ['password', 'Gerar senha', 'Gera uma senha forte', 'safe', 'F4', KeyRound],
  ],
  productivity: [
    ['tasks', 'Tarefas', 'Adiciona "pagar a luz" nas tarefas', 'safe', 'F5', ListTodo],
    ['reminders', 'Lembretes', 'Me lembra de ligar pra mãe às 18h', 'safe', 'F5', Bell],
    ['habits', 'Hábitos', 'Bebi um copo de água', 'safe', 'F5', Repeat],
    ['routines', 'Rotinas', 'Ativa o modo trabalho', 'confirm', 'F5', Workflow],
    ['clipboard', 'Histórico do clipboard', 'O que eu copiei antes?', 'safe', 'F4', Clipboard],
  ],
  pc: [
    ['volume', 'Volume', 'Abaixa o volume pra 30', 'safe', 'F6', Volume2],
    ['media', 'Mídia', 'Pula essa música', 'safe', 'F6', Music],
    ['open', 'Abrir app ou site', 'Abre o YouTube', 'safe', 'F6', AppWindow],
    ['close', 'Fechar app', 'Fecha o Chrome', 'confirm', 'F6', CircleX],
    ['windows', 'Janelas', 'Organiza as janelas lado a lado', 'confirm', 'F6', LayoutGrid],
    [
      'desktop',
      'Organizar área de trabalho',
      'Arruma minha área de trabalho',
      'confirm',
      'F6',
      FolderTree,
    ],
    ['shutdown', 'Desligar agendado', 'Desliga o PC daqui a 1 hora', 'dangerous', 'F6', Power],
    ['vision', 'Screenshot e visão', 'O que tem na minha tela?', 'confirm', 'F6', ScanEye],
    ['dictation', 'Ditado', 'Digita o que eu falar', 'confirm', 'F6', Mic],
    ['input', 'Teclado e mouse', 'Clica em "Enviar"', 'dangerous', 'F6', Mouse],
    ['shell', 'Shell', 'Roda o build do projeto', 'dangerous', 'F6', SquareTerminal],
  ],
  integrations: [
    ['spotify', 'Spotify', 'Toca minha playlist de foco', 'safe', 'F7', Music],
    ['calendar', 'Google Calendar', 'O que tenho amanhã?', 'confirm', 'F7', CalendarDays],
    ['claude', 'Claude Code', 'Manda o Claude corrigir esse bug', 'confirm', 'F7', Code],
    ['mcp', 'Servidores MCP', 'Usa o MCP do GitHub', 'confirm', 'F7', Blocks],
    ['tuya', 'Casa (Tuya)', 'Apaga a luz do quarto', 'confirm', 'F7', Lamp],
    ['cameras', 'Câmeras', 'Mostra a câmera da garagem', 'confirm', 'F7', Cctv],
  ],
}

export const TOOLS: (ToolInfo & { icon: LucideIcon })[] = Object.entries(ROWS).flatMap(
  ([category, rows]) =>
    rows.map(([id, name, example, risk, phase, icon]) => ({
      id,
      name,
      example,
      risk,
      phase,
      icon,
      category: category as ToolCategory,
    })),
)
