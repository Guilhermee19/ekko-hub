import { CalendarDays, Music, type LucideIcon } from 'lucide-react'
import { SPOTIFY_REDIRECT_URI, type IntegrationProvider } from '@/lib/ipc'

// Step-by-step setup for services where the user brings their own (free) developer app.
// A new OAuth service = a new entry here + its connect command in the backend.

export interface GuideStep {
  text: string
  /** Optional link opened in the system browser. */
  link?: { label: string; url: string }
  /** Value to paste somewhere, with a copy button (e.g. Redirect URI). */
  copy?: string
}

export interface OAuthGuide {
  provider: IntegrationProvider
  icon: LucideIcon
  name: string
  description: string
  steps: GuideStep[]
  /** Google "Desktop app" clients also need the client secret. */
  needsSecret: boolean
  /** Small print under the steps. */
  note: string
}

export const SPOTIFY_GUIDE: OAuthGuide = {
  provider: 'spotify',
  icon: Music,
  name: 'Spotify',
  description: 'Fila, dispositivos e tocar em outro aparelho (Spotify Connect).',
  needsSecret: false,
  steps: [
    {
      text: 'Entre no painel de desenvolvedor do Spotify com a sua conta.',
      link: {
        label: 'Abrir o Spotify for Developers',
        url: 'https://developer.spotify.com/dashboard',
      },
    },
    {
      text: 'Clique em “Create app”. Dê qualquer nome e descrição e marque “Web API”.',
    },
    {
      text: 'Em “Redirect URIs”, cole exatamente este endereço e clique em “Add” e depois em “Save”:',
      copy: SPOTIFY_REDIRECT_URI,
    },
    {
      text: 'Abra “Settings” do app, copie o Client ID, cole abaixo e clique em Conectar.',
    },
  ],
  note: 'Não precisa de Client secret: o Ekko usa PKCE. Controlar a reprodução exige Spotify Premium.',
}

export const GOOGLE_GUIDE: OAuthGuide = {
  provider: 'google',
  icon: CalendarDays,
  name: 'Google Agenda',
  description: 'Próximos eventos no notch, aviso 10 min antes e “entrar na reunião”.',
  needsSecret: true,
  steps: [
    {
      text: 'No Google Cloud Console, crie um projeto (qualquer nome).',
      link: {
        label: 'Abrir o Google Cloud Console',
        url: 'https://console.cloud.google.com/projectcreate',
      },
    },
    {
      text: 'Ative a Google Calendar API nesse projeto.',
      link: {
        label: 'Ativar a Calendar API',
        url: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
      },
    },
    {
      text: 'Configure a tela de consentimento: público “Externo” e adicione o seu e-mail em “Usuários de teste”.',
      link: {
        label: 'Abrir a tela de consentimento',
        url: 'https://console.cloud.google.com/auth/overview',
      },
    },
    {
      text: 'Em Credenciais, crie um “ID do cliente OAuth” do tipo “App para computador”. Não precisa de Redirect URI.',
      link: {
        label: 'Abrir Credenciais',
        url: 'https://console.cloud.google.com/apis/credentials',
      },
    },
    {
      text: 'Cole o Client ID e o Client secret abaixo e clique em Conectar.',
    },
  ],
  note: 'O Ekko só lê a agenda (calendar.readonly). O secret fica no Gerenciador de Credenciais do Windows. Com o app em “Teste”, o Google pede login de novo a cada 7 dias.',
}
