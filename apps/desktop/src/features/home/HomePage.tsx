import { ChevronRight, Mic, SendHorizontal, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useChat } from '@/features/chat/store'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { DisplayModePicker } from '@/surfaces/settings/DisplayModePicker'
import { DEMO_LABELS, demo, type DemoKey } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { IconButton, Kbd } from '@/ui/primitives'
import { HomeCards } from './HomeCards'
import { NowPlaying, RecentChat } from './HomeWidgets'

function greeting(hour: number): string {
  if (hour < 5) return 'Boa noite'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Home (Kobi layout): greeting, ask box, summary cards, now playing, last messages. */
export function HomePage({ compact, go }: PageProps) {
  const { userName, assistantName } = useSettings((s) => s.settings)
  const [text, setText] = useState('')

  const send = () => {
    const t = text.trim()
    if (!t) return
    useChat.getState().send(t)
    setText('')
    go('chat')
  }

  return (
    <div className="animate-rise-in @container flex flex-col gap-4">
      <header>
        <h1 className="text-[20px] font-semibold">
          {greeting(new Date().getHours())}
          {userName.trim() ? `, ${userName.trim()}` : ''}!
        </h1>
        <p className="text-[12px] text-muted">
          Escreva, fale ou diga “Ei, {assistantName}” · <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd>{' '}
          <Kbd>Espaço</Kbd>
        </p>
      </header>

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

      <HomeCards compact={compact} go={go} />

      {/* Sized by the panel itself (notch, hub and dock differ), not by the window. */}
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-1 @lg:grid-cols-2')}>
        <NowPlaying go={go} compact={compact} />
        <RecentChat go={go} />
      </div>

      <PrototypeTools compact={compact} />
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
