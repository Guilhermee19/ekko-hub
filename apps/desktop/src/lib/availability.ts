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
    status: 'live',
    note: 'Guarda textos, imagens e arquivos que você copiar. Senhas de gerenciadores ficam de fora. Os atalhos dos snippets ainda não expandem sozinhos.',
  },
  colors: {
    status: 'live',
    note: 'Guarda as 32 cores mais recentes e todas as fixadas. A opacidade só entra nos códigos copiados.',
  },
  routines: {
    status: 'soon',
    phase: 'F5',
    note: 'Rotinas de exemplo; os gatilhos reais chegam na F5.',
  },
  mypc: {
    status: 'live',
    note: 'Temperatura só aparece se o PC expuser sensores ao Windows. Programas de inicialização são só listados.',
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
  notifications: { status: 'live' },
  clipboard: { status: 'live' },
  appearance: { status: 'live' },
  display: { status: 'live' },
  notch: { status: 'live' },
  pill: { status: 'live' },
  seasons: { status: 'live' },
  menu: { status: 'live' },
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
    status: 'partial',
    phase: 'F6',
    note: 'O log de auditoria já é real para as ações do Meu PC; exportar e retenção ainda são de exemplo.',
  },
  connections: { status: 'live' },
  diagnostics: {
    status: 'soon',
    phase: 'F9',
    note: 'Testes simulados; o diagnóstico real chega na F9.',
  },
  about: { status: 'live' },
}

/** Prototypes ("Em breve") stay out of the UI until their phase lands; flip the status
 * above and the page/section comes back everywhere (menu, palette, settings). */
export const isShown = (a: Availability) => a.status !== 'soon'
export const pageShown = (id: PageId) => isShown(PAGE_AVAILABILITY[id])
export const sectionShown = (id: SectionId) => isShown(SECTION_AVAILABILITY[id])

export const STATUS_LABEL: Record<Exclude<Status, 'live'>, string> = {
  partial: 'Em parte',
  soon: 'Em breve',
}
