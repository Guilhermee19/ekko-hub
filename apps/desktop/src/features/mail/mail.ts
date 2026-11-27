import type { MailMessage } from '@/lib/ipc'

const INBOX: Record<MailMessage['provider'], string> = {
  gmail: 'https://mail.google.com/mail/u/0/#inbox',
  outlook: 'https://outlook.live.com/mail/0/inbox',
}

/** Where "Ver" goes: the message itself, or the inbox when the provider gave no link. */
export function mailLink(m: MailMessage): string {
  return m.link.startsWith('https://') ? m.link : INBOX[m.provider]
}

/** Unread messages worth a look (promotions and "Outras" left out). */
export function unreadCount(messages: MailMessage[]): number {
  return messages.filter((m) => m.unread && !m.quiet).length
}

const MIN = 60_000
const DAY = 24 * 60 * MIN

/** "agora", "há 12 min", "14:05" today, "ontem", or "25/11". */
export function receivedLabel(ms: number, now: number): string {
  const ago = now - ms
  if (ago < MIN) return 'agora'
  if (ago < 60 * MIN) return `há ${Math.floor(ago / MIN)} min`
  const date = new Date(ms)
  const today = new Date(now)
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (new Date(now - DAY).toDateString() === date.toDateString()) return 'ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
