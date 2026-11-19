import {
  Check,
  ChevronRight,
  LayoutGrid,
  Mic,
  SendHorizontal,
  SlidersHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { useChat } from '@/features/chat/store'
import { backend } from '@/lib/ipc'
import { pageShown } from '@/lib/availability'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { DisplayModePicker } from '@/surfaces/settings/DisplayModePicker'
import { DEMO_LABELS, demo, type DemoKey } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { comboKeys } from '@/surfaces/settings/sections/shortcutsCombo'
import { Button, IconButton, Kbd } from '@/ui/primitives'
import { HomeCards } from './HomeCards'
import { RecentChat } from './HomeWidgets'

function greeting(hour: number): string {
  if (hour < 5) return 'Boa noite'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Home (Kobi layout): greeting, ask box and the cards the user picked. */
export function HomePage({ compact, go }: PageProps) {
  const { userName, assistantName } = useSettings((s) => s.settings)
  const [text, setText] = useState('')
  // Typing/talking to Ekko needs the Conversa page (F2); until then the home is a summary.
  const chat = pageShown('chat')
  const summonCombo = useSettings((s) => s.settings.shortcuts.summon)
  const [editing, setEditing] = useState(false)

  const send = () => {
    const t = text.trim()
    if (!t) return
    useChat.getState().send(t)
    setText('')
    go('chat')
  }

  return (
    <div className="animate-rise-in @container flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold">
            {greeting(new Date().getHours())}
            {userName.trim() ? `, ${userName.trim()}` : ''}!
          </h1>
          <p className="text-[12px] text-muted">
            {chat
              ? `Escreva, fale ou diga “Ei, ${assistantName}” · `
              : 'Chame de qualquer lugar com '}
            {comboKeys(summonCombo).map((k, i) => (
              <span key={k}>
                {i > 0 && ' '}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </p>
        </div>
        <Button
          size="sm"
          variant={editing ? 'primary' : 'ghost'}
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
        >
          {editing ? <Check className="size-3.5" /> : <LayoutGrid className="size-3.5" />}
          {editing ? 'Pronto' : 'Personalizar'}
        </Button>
      </header>

      {chat && (
        <div className="flex items-center gap-2 rounded-xl border border-border-soft bg-base/60 py-1.5 pr-1.5 pl-3 focus-within:border-accent/50">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Escreva ou fale com o ${assistantName}…`}
            aria-label={`Mensagem para o ${assistantName}`}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted"
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <IconButton label="Enviar" onClick={send} disabled={!text.trim()}>
            <SendHorizontal className="size-4" />
          </IconButton>
          <IconButton label="Falar" tone="accent" onClick={demo.listening}>
            <Mic className="size-4" />
          </IconButton>
        </div>
      )}

      <HomeCards compact={compact} go={go} editing={editing} />

      {chat && <RecentChat go={go} />}

      {/* Fake states are for the browser gallery only, never the real app. */}
      {backend.kind === 'mock' && <PrototypeTools compact={compact} />}
    </div>
  )
}

/** Demo controls + display mode, folded away so the home reads like the real thing. */
function PrototypeTools({ compact }: { compact: boolean }) {
  return (
    <details className="group rounded-xl border border-dashed border-border-soft px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-muted">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
        <span className="label-hud">Protótipo · simular estados e modo de exibição</span>
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        <div className={cn('grid gap-1.5', compact ? 'grid-cols-3' : 'grid-cols-5')}>
          {(Object.keys(DEMO_LABELS) as DemoKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={demo[key]}
              className={cn(
                'rounded-lg border border-border-soft px-2 py-1.5 text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-content',
                key === 'conversation' && 'col-span-2 border-accent/30 text-accent',
              )}
            >
              {DEMO_LABELS[key]}
            </button>
          ))}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="label-hud">Modo de exibição</span>
            <button
              type="button"
              onClick={() => void backend.openSettings()}
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-accent"
            >
              <SlidersHorizontal className="size-3.5" /> Personalizar posição e tamanho
            </button>
          </div>
          <DisplayModePicker dense={compact} />
        </div>
      </div>
    </details>
  )
}
