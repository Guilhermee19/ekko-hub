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
  home: {
    status: 'partial',
    phase: 'F5',
    note: 'Timers, música e agenda são reais; tarefas, água e avisos ainda são exemplo.',
  },
  chat: {
    status: 'soon',
    phase: 'F2',
    note: 'As respostas ainda são simuladas; a conversa com IA chega na F2.',
  },
  tasks: {
    status: 'soon',
    phase: 'F5',
    note: 'Lista de exemplo; tarefas e lembretes salvos chegam na F5.',
  },
  timers: { status: 'live', note: 'Cronômetro ainda é local a esta janela.' },
  habits: {
    status: 'soon',
    phase: 'F5',
    note: 'Hábitos de exemplo; o acompanhamento real chega na F5.',
  },
  music: {
    status: 'partial',
    phase: 'F7',
    note: 'O que está tocando e os controles são reais; fila, volume e dispositivos dependem do Spotify conectado.',
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
  notifications: {
    status: 'partial',
    phase: 'F5',
    note: 'Avisos de timers são reais; lembretes chegam na F5.',
  },
}

export const SECTION_AVAILABILITY: Record<SectionId, Availability> = {
  general: {
    status: 'partial',
    phase: 'F9',
    note: 'Iniciar com o Windows, não perturbe e sons chegam na F9; "Refazer boas-vindas" já funciona.',
  },
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
    status: 'partial',
    phase: 'F9',
    note: 'Os atalhos globais funcionam com os padrões; trocar por aqui chega na F9.',
  },
  privacy: {
    status: 'soon',
    phase: 'F6',
    note: 'Log de auditoria de exemplo; a auditoria real chega com o controle do PC (F6).',
  },
  connections: {
    status: 'partial',
    phase: 'F7',
    note: 'Spotify e Google Agenda são reais; os outros serviços chegam na F7.',
  },
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
