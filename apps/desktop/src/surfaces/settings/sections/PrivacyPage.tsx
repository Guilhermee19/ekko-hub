import { Camera, HardDrive, KeyRound, Mic, ScreenShare, ShieldCheck } from 'lucide-react'
import { Badge } from '@/ui/data'
import { Toggle } from '@/ui/forms'
import { Card } from '@/ui/primitives'
import { Field } from '../Field'
import { PrivacyAudit } from './PrivacyAudit'
import { usePrefsSystem } from './prefsSystem'
import { InlineConfirm, PageTitle, Select, StatusDot } from './systemUi'

const PERMISSIONS = [
  {
    id: 'mic',
    label: 'Microfone',
    icon: Mic,
    granted: true,
    hint: 'Usado no push-to-talk e no "Ei, Ekko"',
  },
  {
    id: 'cam',
    label: 'Câmera',
    icon: Camera,
    granted: false,
    hint: 'Só quando você pedir para ver algo',
  },
  {
    id: 'screen',
    label: 'Captura de tela',
    icon: ScreenShare,
    granted: true,
    hint: 'Só em "o que tem na minha tela?"',
  },
]

export function PrivacyPage() {
  const keys = usePrefsSystem((s) => s.apiKeys)
  const history = usePrefsSystem((s) => s.historyRetention)
  const { removeKey, setHistoryRetention, clearHistory } = usePrefsSystem.getState()

  return (
    <div className="animate-rise-in mx-auto flex max-w-3xl flex-col gap-8">
      <PageTitle
        title="Privacidade e segurança"
        subtitle="O que o Ekko guarda, onde e por quanto tempo."
      />

      <Card className="flex items-start gap-3 border-accent/30 bg-accent/5 p-4">
        <ShieldCheck className="hud-glow mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div>
          <p className="text-[14px] font-medium">Tudo fica no seu PC</p>
          <p className="text-[12px] text-muted">
            Conversas, memória e o log de auditoria ficam em{' '}
            <span className="font-mono">%APPDATA%\ekko-hub</span>. Só o texto da conversa vai para a
            IA que você escolher; com a IA local, nada sai do PC.
          </p>
        </div>
      </Card>

      <Field
        title="Chaves de API"
        hint="Guardadas no Gerenciador de Credenciais do Windows, nunca em arquivo."
      >
        <ul className="divide-y divide-border-soft rounded-xl border border-border-soft">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-3 py-2">
              <KeyRound className="size-4 text-muted" aria-hidden />
              <span className="flex-1 text-[13px]">{k.label}</span>
              {k.saved ? (
                <>
                  <Badge tone="accent">Salva</Badge>
                  <InlineConfirm
                    label="Remover"
                    question="Remover a chave?"
                    confirmLabel="Remover"
                    onConfirm={() => removeKey(k.id)}
                  />
                </>
              ) : (
                <Badge>Não configurada</Badge>
              )}
            </li>
          ))}
        </ul>
      </Field>

      <Field title="Log de auditoria" hint="Toda ação que o Ekko faz no PC fica registrada aqui.">
        <PrivacyAudit />
      </Field>

      <Field title="Histórico de conversa" hint="Por quanto tempo as conversas ficam salvas.">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            label="Retenção do histórico de conversa"
            value={history}
            options={[
              { value: '7', label: '7 dias' },
              { value: '30', label: '30 dias' },
              { value: '90', label: '90 dias' },
              { value: 'forever', label: 'Para sempre' },
            ]}
            onChange={setHistoryRetention}
          />
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <HardDrive className="size-3.5" aria-hidden /> 214 conversas · 3,2 MB
          </span>
          <span className="ml-auto">
            <InlineConfirm
              size="md"
              label="Apagar histórico"
              question="Apagar todas as conversas?"
              confirmLabel="Apagar tudo"
              onConfirm={clearHistory}
            />
          </span>
        </div>
      </Field>

      <Field
        title="Telemetria"
        hint="Sem coleta de uso, sem analytics, sem relatório de erro automático."
      >
        <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface p-3">
          <div className="flex-1">
            <p className="text-[13px]">Enviar dados de uso</p>
            <p className="text-[12px] text-muted">
              Desligado e travado: o Ekko não envia nada. Para reportar um bug, use “Copiar
              relatório” em Diagnóstico.
            </p>
          </div>
          <Toggle checked={false} disabled label="Enviar dados de uso" onChange={() => {}} />
        </div>
      </Field>

      <Field title="Permissões do Windows" hint="O que o Windows deixa o Ekko acessar.">
        <ul className="grid grid-cols-3 gap-2">
          {PERMISSIONS.map(({ id, label, icon: Icon, granted, hint }) => (
            <li
              key={id}
              className="flex flex-col gap-1.5 rounded-xl border border-border-soft bg-surface p-3"
            >
              <span className="flex items-center gap-2 text-[13px] font-medium">
                <Icon className="size-4 text-muted" aria-hidden /> {label}
              </span>
              <span className="flex items-center gap-1.5 text-[12px]">
                <StatusDot tone={granted ? 'on' : 'off'} />
                {granted ? 'Permitido' : 'Não pedido ainda'}
              </span>
              <span className="text-[11px] text-muted">{hint}</span>
            </li>
          ))}
        </ul>
      </Field>
    </div>
  )
}
