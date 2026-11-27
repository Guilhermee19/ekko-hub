import { Mail, Inbox } from 'lucide-react'
import type { OAuthGuide } from './oauthGuides'

// E-mail accounts (read-only). Gmail reuses the Agenda's Google project; Outlook needs a
// free Microsoft Entra app.

/** Microsoft ignores the port of loopback redirects: one entry covers every login. */
export const OUTLOOK_REDIRECT_URI = 'http://127.0.0.1/callback'

export const GMAIL_GUIDE: OAuthGuide = {
  provider: 'gmail',
  icon: Mail,
  name: 'Gmail',
  description: 'Caixa de entrada no painel e aviso no notch quando chega e-mail novo.',
  needsSecret: true,
  steps: [
    {
      text: 'Use o mesmo projeto do Google Cloud da Agenda (ou crie um). Ative a Gmail API nele.',
      link: {
        label: 'Ativar a Gmail API',
        url: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
      },
    },
    {
      text: 'Na tela de consentimento, confira se o seu e-mail está em “Usuários de teste”.',
      link: {
        label: 'Abrir a tela de consentimento',
        url: 'https://console.cloud.google.com/auth/audience',
      },
    },
    {
      text: 'Em Credenciais, use o “ID do cliente OAuth” do tipo “App para computador”. Cole o Client ID e o Client secret abaixo e clique em Conectar.',
      link: {
        label: 'Abrir Credenciais',
        url: 'https://console.cloud.google.com/apis/credentials',
      },
    },
  ],
  note: 'O Ekko só lê (gmail.readonly): remetente, assunto e o começo do texto. Ele não apaga nem envia nada. O Client ID é o mesmo da Agenda. Com o app em “Teste”, o Google pede login de novo a cada 7 dias.',
}

export const OUTLOOK_GUIDE: OAuthGuide = {
  provider: 'outlook',
  icon: Inbox,
  name: 'Outlook (Hotmail)',
  description: 'Hotmail, Outlook.com e Live: caixa de entrada e aviso de e-mail novo.',
  needsSecret: false,
  steps: [
    {
      text: 'Entre no Microsoft Entra com a sua conta da Microsoft e abra “Registros de aplicativo”.',
      link: {
        label: 'Abrir Registros de aplicativo',
        url: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
      },
    },
    {
      text: 'Clique em “Novo registro”. Dê um nome (ex.: Ekko) e, em tipos de conta, escolha “Somente contas pessoais da Microsoft”.',
    },
    {
      text: 'Em “URI de Redirecionamento”, escolha “Cliente público/nativo (móvel e área de trabalho)” e cole este endereço:',
      copy: OUTLOOK_REDIRECT_URI,
    },
    {
      text: 'Clique em “Registrar”, copie o “ID do aplicativo (cliente)”, cole abaixo e clique em Conectar.',
    },
  ],
  note: 'Não precisa de segredo: o Ekko usa PKCE. Ele só lê (Mail.Read): remetente, assunto e o começo do texto, sem apagar nem enviar nada.',
}
