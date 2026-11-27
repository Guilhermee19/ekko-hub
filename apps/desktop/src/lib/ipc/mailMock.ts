import type { MailBackend, MailMessage, MailProvider } from './mailTypes'

// Gallery stand-in: a few sample messages per connected account. The integrations mock
// tells which accounts are connected.

const MIN = 60_000
const accounts = new Map<MailProvider, string>()
const changed = new Set<(messages: MailMessage[]) => void>()
const arrived = new Set<(messages: MailMessage[]) => void>()

const SAMPLES: Omit<MailMessage, 'id' | 'provider' | 'account' | 'link' | 'receivedMs'>[] = [
  {
    fromName: 'Ana Souza',
    fromAddr: 'ana@estudio.com',
    subject: 'Proposta do site revisada',
    snippet: 'Oi! Segue a proposta com os ajustes que conversamos ontem.',
    unread: true,
    quiet: false,
  },
  {
    fromName: 'Banco Exemplo',
    fromAddr: 'fatura@banco.example',
    subject: 'Sua fatura de novembro chegou',
    snippet: 'Valor total R$ 1.234,56 com vencimento em 10/12.',
    unread: true,
    quiet: false,
  },
  {
    fromName: 'Loja Online',
    fromAddr: 'ofertas@loja.example',
    subject: 'Black Friday: até 70% off',
    snippet: 'Só hoje, aproveite os descontos em toda a loja.',
    unread: true,
    quiet: true,
  },
  {
    fromName: 'GitHub',
    fromAddr: 'noreply@github.com',
    subject: 'Your pull request was merged',
    snippet: 'release: v0.8.0 was merged into main.',
    unread: false,
    quiet: false,
  },
]

function messages(): MailMessage[] {
  const now = Date.now()
  return [...accounts].flatMap(([provider, account], a) =>
    SAMPLES.map((m, i) => ({
      ...m,
      id: `${provider}-${i}`,
      provider,
      account,
      receivedMs: now - (i * 47 + a * 13 + 4) * MIN,
      link:
        provider === 'gmail'
          ? `https://mail.google.com/mail/u/${account}/#inbox`
          : 'https://outlook.live.com/mail/0/inbox',
    })),
  )
}

const sorted = () => messages().sort((a, b) => b.receivedMs - a.receivedMs)

/** Called by the integrations mock when an e-mail account connects or disconnects. */
export function mockMailAccount(provider: MailProvider, account: string | null) {
  if (account) accounts.set(provider, account)
  else accounts.delete(provider)
  const list = sorted()
  changed.forEach((cb) => cb(list))
}

/** Gallery helper: a new message arrives, as the Rust poller would announce it. */
export function mockMailArrives(message: MailMessage) {
  arrived.forEach((cb) => cb([message]))
}

export const mockMail: MailBackend = {
  mailMessages: () => Promise.resolve(sorted()),
  mailRefresh: () => Promise.resolve(),
  onMailChanged: (cb) => {
    changed.add(cb)
    return Promise.resolve(() => void changed.delete(cb))
  },
  onMailNew: (cb) => {
    arrived.add(cb)
    return Promise.resolve(() => void arrived.delete(cb))
  },
}
