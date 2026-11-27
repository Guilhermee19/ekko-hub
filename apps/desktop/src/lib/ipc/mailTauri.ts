import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { MAIL_CHANGED, MAIL_NEW, type MailBackend, type MailMessage } from './mailTypes'

export const tauriMail: MailBackend = {
  mailMessages: () => invoke('mail_messages'),
  mailRefresh: () => invoke('mail_refresh'),
  onMailChanged: (cb) => listen<MailMessage[]>(MAIL_CHANGED, (e) => cb(e.payload)),
  onMailNew: (cb) => listen<MailMessage[]>(MAIL_NEW, (e) => cb(e.payload)),
}
