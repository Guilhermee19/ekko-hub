// Mirrors crates/ekko-integrations/src/mail + services/mail.rs (read-only e-mail).

export const MAIL_CHANGED = 'ekko://mail/changed'
export const MAIL_NEW = 'ekko://mail/new'

export type MailProvider = 'gmail' | 'outlook'

export interface MailMessage {
  id: string
  provider: MailProvider
  /** The account's address. */
  account: string
  fromName: string
  fromAddr: string
  subject: string
  snippet: string
  receivedMs: number
  unread: boolean
  /** Promotions / social (Gmail) or "Outras" (Outlook): listed, never announced. */
  quiet: boolean
  /** Opens the message in Gmail or Outlook on the web. */
  link: string
}

type Unlisten = () => void

export interface MailBackend {
  /** Latest inbox messages of every connected account, newest first. */
  mailMessages(): Promise<MailMessage[]>
  /** Looks for new messages now instead of waiting for the next minute. */
  mailRefresh(): Promise<void>
  onMailChanged(cb: (messages: MailMessage[]) => void): Promise<Unlisten>
  /** Unread messages that just arrived (promotions left out), newest first. */
  onMailNew(cb: (messages: MailMessage[]) => void): Promise<Unlisten>
}
