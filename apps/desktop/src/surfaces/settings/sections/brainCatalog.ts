import type { BrainMode, Personality, ProviderId } from './prefsAssistant'

// Mock catalog for the Brain page. Real model lists come from each provider in F2.

export const MODES: { id: BrainMode; title: string; hint: string; tag: string }[] = [
  {
    id: 'auto',
    title: 'Automático grátis',
    hint: 'Groq e Gemini no plano gratuito, com troca automática se um cair.',
    tag: 'Recomendado',
  },
  {
    id: 'pick',
    title: 'Eu escolho a IA',
    hint: 'Use sua chave do Claude, ChatGPT, Gemini ou Groq.',
    tag: 'Sua chave',
  },
  {
    id: 'local',
    title: 'No meu PC',
    hint: 'Roda offline com o Ollama. Precisa de 8 GB+ de RAM.',
    tag: 'Offline',
  },
]

export interface Provider {
  id: ProviderId
  name: string
  vendor: string
  keyPrefix: string
  models: string[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Claude',
    vendor: 'Anthropic',
    keyPrefix: 'sk-ant-',
    models: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    keyPrefix: 'sk-',
    models: ['gpt-5.1-mini', 'gpt-5.1', 'gpt-5.1-nano'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    keyPrefix: 'AIza',
    models: ['gemini-3-flash', 'gemini-3-pro', 'gemini-3-flash-lite'],
  },
  {
    id: 'groq',
    name: 'Groq',
    vendor: 'Groq',
    keyPrefix: 'gsk_',
    models: ['llama-4-scout', 'llama-4-maverick', 'qwen3-32b'],
  },
]

export interface LocalModel {
  id: string
  sizeMb: number
  hint: string
  recommended?: boolean
}

export const OLLAMA_MODELS: LocalModel[] = [
  { id: 'qwen3:4b', sizeMb: 2600, hint: 'Leve, roda bem com 8 GB' },
  { id: 'qwen3:8b', sizeMb: 5200, hint: 'Equilíbrio entre rapidez e qualidade', recommended: true },
  { id: 'qwen3:14b', sizeMb: 9300, hint: 'Melhor resposta, pede 16 GB+' },
  { id: 'llama3.2:3b', sizeMb: 2000, hint: 'Bem rápido, tool calling básico' },
]

export const PERSONALITIES: { id: Personality; label: string; sample: string }[] = [
  { id: 'fun', label: 'Divertido', sample: 'Bora! Timer de 10 min rodando, nada de sumir, hein?' },
  { id: 'cute', label: 'Fofo', sample: 'Prontinho! Coloquei seu timer de 10 minutinhos.' },
  {
    id: 'pro',
    label: 'Profissional',
    sample: 'Timer de 10 minutos iniciado. Aviso quando terminar.',
  },
  {
    id: 'sarcastic',
    label: 'Sarcástico',
    sample: 'Mais 10 minutos de "só uma pausa". Claro. Rodando.',
  },
  { id: 'zen', label: 'Zen', sample: 'Dez minutos começam agora. Respire, eu cuido do tempo.' },
]

/** Masks a secret for display: keeps the prefix and the last 4 characters. */
export function maskKey(key: string, prefix = ''): string {
  const k = key.trim()
  if (!k) return ''
  if (k.length <= 8) return '•'.repeat(k.length)
  const head = prefix && k.startsWith(prefix) ? prefix : k.slice(0, 3)
  return `${head}${'•'.repeat(6)}${k.slice(-4)}`
}

/** Mock download time for a local model: a few seconds, longer for bigger ones. */
export const mockDownloadMs = (sizeMb: number) => 2000 + sizeMb * 0.6
