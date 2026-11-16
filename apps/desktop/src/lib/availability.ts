import type { PageId } from '@/surfaces/panel/nav'
import type { SectionId } from '@/surfaces/settings/sections'

// What already works for real vs. what is still a prototype with sample data.
// One place to update as phases land (see docs/ROADMAP.md).

export type Status = 'live' | 'partial' | 'soon'

export interface Availability {
  status: Status
  /** Roadmap phase that makes it real. */
  phase?: string
  /** One line shown in the banner. */
  note?: string
}

export const PAGE_AVAILABILITY: Record<PageId, Availability> = {
  home: { status: 'live' },
  chat: {
    status: 'soon',
    phase: 'F2',
    note: 'As respostas ainda são simuladas; a conversa com IA chega na F2.',
  },
  tasks: { status: 'live', note: 'Tarefas e lembretes ficam salvos neste PC.' },
  timers: { status: 'live', note: 'Cronômetro ainda é local a esta janela.' },
  habits: { status: 'live', note: 'Água e hábitos zeram à meia-noite.' },
  music: {
    status: 'live',
    note: 'Controles e volume do Windows funcionam com qualquer player; conecte o Spotify em Configurações → Conexões para fila, dispositivos, aleatório e repetir.',
  },
  agenda: { status: 'live', note: 'Conecte o Google Agenda em Configurações → Conexões.' },
  clipboard: {
    status: 'soon',
    phase: 'F4',
    note: 'Histórico de exemplo; a leitura real da área de transferência chega na F4.',
  },
  routines: {
    status: 'soon',
    phase: 'F5',
    note: 'Rotinas de exemplo; os gatilhos reais chegam na F5.',
  },
  mypc: {
    status: 'soon',
    phase: 'F6',
    note: 'Números simulados; o status real do PC chega na F6.',
  },
  memory: {
    status: 'soon',
    phase: 'F7',
    note: 'Fatos de exemplo; a memória de longo prazo chega na F7.',
  },
  notifications: { status: 'live', note: 'A lista de avisos ainda zera ao fechar o Ekko.' },
}

export const SECTION_AVAILABILITY: Record<SectionId, Availability> = {
  general: { status: 'live', note: 'Idioma e tema claro ainda não estão disponíveis.' },
  appearance: { status: 'live' },
  avatar: {
    status: 'soon',
    phase: 'F8',
    note: 'Prévia do personagem; as expressões e a customização chegam na F8.',
  },
  brain: {
    status: 'soon',
    phase: 'F2',
    note: 'Escolha de IA e chaves ainda não são usadas; a conversa com IA chega na F2.',
  },
  voice: {
    status: 'soon',
    phase: 'F3',
    note: 'Comandos de voz estão em construção; microfone, wake word e vozes chegam na F3.',
  },
  tools: {
    status: 'soon',
    phase: 'F4',
    note: 'Catálogo e autonomia ainda não controlam nada; o motor de funções chega na F4.',
  },
  shortcuts: {
    status: 'live',
    note: 'Fala, ditado e texto selecionado já ficam reservados; as ações chegam na F3 e F6.',
  },
  privacy: {
    status: 'soon',
    phase: 'F6',
    note: 'Log de auditoria de exemplo; a auditoria real chega com o controle do PC (F6).',
  },
  connections: { status: 'live' },
  diagnostics: {
    status: 'soon',
    phase: 'F9',
    note: 'Testes simulados; o diagnóstico real chega na F9.',
  },
  about: { status: 'live' },
}

export const STATUS_LABEL: Record<Exclude<Status, 'live'>, string> = {
  partial: 'Em parte',
  soon: 'Em breve',
}
