import { describe, expect, it } from 'vitest'
import type { MailMessage } from '@/lib/ipc'
import { mailLink, receivedLabel, unreadCount } from './mail'

const msg = (over: Partial<MailMessage> = {}): MailMessage => ({
  id: '1',
  provider: 'gmail',
  account: 'eu@gmail.com',
  fromName: 'Ana',
  fromAddr: 'ana@x.com',
  subject: 'Oi',
  snippet: '',
  receivedMs: 0,
  unread: true,
  quiet: false,
  link: 'https://mail.google.com/mail/u/eu@gmail.com/#inbox/1',
  ...over,
})

describe('mail helpers', () => {
  it('opens the message, or the inbox when there is no link', () => {
    expect(mailLink(msg())).toBe('https://mail.google.com/mail/u/eu@gmail.com/#inbox/1')
    expect(mailLink(msg({ provider: 'outlook', link: '' }))).toBe(
      'https://outlook.live.com/mail/0/inbox',
    )
  })

  it('counts unread messages that are not promotions', () => {
    expect(unreadCount([msg(), msg({ unread: false }), msg({ quiet: true })])).toBe(1)
  })

  it('labels the arrival time', () => {
    const now = new Date(2026, 10, 27, 15, 0).getTime()
    expect(receivedLabel(now - 30_000, now)).toBe('agora')
    expect(receivedLabel(now - 12 * 60_000, now)).toBe('há 12 min')
    expect(receivedLabel(new Date(2026, 10, 27, 9, 5).getTime(), now)).toBe('09:05')
    expect(receivedLabel(new Date(2026, 10, 26, 20, 0).getTime(), now)).toBe('ontem')
    expect(receivedLabel(new Date(2026, 10, 20, 8, 0).getTime(), now)).toBe('20/11')
  })
})
