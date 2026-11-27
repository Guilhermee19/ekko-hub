import { create } from 'zustand'
import { backend, type MailMessage } from '@/lib/ipc'
import { mailLink } from './mail'

// Latest inbox messages of the connected accounts. The Rust poller looks every minute
// and broadcasts the list; every window keeps its own copy.

interface MailState {
  messages: MailMessage[]
  /** The first answer from the backend arrived. */
  loaded: boolean
}

export const useMail = create<MailState>(() => ({ messages: [], loaded: false }))

const report = (err: unknown) => console.warn('[ekko] e-mail', err)
const receive = (messages: MailMessage[]) => useMail.setState({ messages, loaded: true })

/** "Ver": the message in Gmail or Outlook on the web. */
export function openMail(m: MailMessage) {
  backend.openExternal(mailLink(m)).catch(report)
}

export function refreshMail() {
  backend.mailRefresh().catch(report)
}

backend.onMailChanged(receive).catch(report)
backend.mailMessages().then(receive, report)
