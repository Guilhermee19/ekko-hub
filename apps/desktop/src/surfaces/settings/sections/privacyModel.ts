import type { Risk } from './toolsModel'

// Audit log rows as the backend will store them (F4+). Mock rows below for F1c.

export type AuditResult = 'ok' | 'denied' | 'error'
export type AuditSource = 'voice' | 'text' | 'routine'

export interface AuditEntry {
  id: string
  /** "HH:MM" local time; the real log keeps a full timestamp. */
  time: string
  tool: string
  detail: string
  risk: Risk
  result: AuditResult
  source: AuditSource
}

export interface AuditFilter {
  risk: Risk | 'all'
  result: AuditResult | 'all'
}

export const RESULT_LABEL: Record<AuditResult, string> = {
  ok: 'ok',
  denied: 'negado',
  error: 'erro',
}

export const SOURCE_LABEL: Record<AuditSource, string> = {
  voice: 'voz',
  text: 'texto',
  routine: 'rotina',
}

export function filterAudit(entries: AuditEntry[], filter: AuditFilter): AuditEntry[] {
  return entries.filter(
    (e) =>
      (filter.risk === 'all' || e.risk === filter.risk) &&
      (filter.result === 'all' || e.result === filter.result),
  )
}

export const MOCK_AUDIT: AuditEntry[] = [
  {
    id: 'a1',
    time: '14:32',
    tool: 'Timer',
    detail: 'timer de 5 min',
    risk: 'safe',
    result: 'ok',
    source: 'voice',
  },
  {
    id: 'a2',
    time: '14:20',
    tool: 'Fechar app',
    detail: 'chrome.exe',
    risk: 'confirm',
    result: 'ok',
    source: 'voice',
  },
  {
    id: 'a3',
    time: '13:58',
    tool: 'Shell',
    detail: 'npm run build',
    risk: 'dangerous',
    result: 'denied',
    source: 'text',
  },
  {
    id: 'a4',
    time: '13:41',
    tool: 'Volume',
    detail: 'volume → 30%',
    risk: 'safe',
    result: 'ok',
    source: 'voice',
  },
  {
    id: 'a5',
    time: '12:15',
    tool: 'Rotinas',
    detail: 'modo trabalho',
    risk: 'confirm',
    result: 'ok',
    source: 'routine',
  },
  {
    id: 'a6',
    time: '11:02',
    tool: 'Clima',
    detail: 'Open-Meteo: São Paulo',
    risk: 'safe',
    result: 'error',
    source: 'voice',
  },
  {
    id: 'a7',
    time: '09:30',
    tool: 'Organizar área de trabalho',
    detail: '18 arquivos movidos',
    risk: 'confirm',
    result: 'ok',
    source: 'text',
  },
  {
    id: 'a8',
    time: '08:00',
    tool: 'Desligar agendado',
    detail: 'desligar às 23:00',
    risk: 'dangerous',
    result: 'ok',
    source: 'routine',
  },
]
