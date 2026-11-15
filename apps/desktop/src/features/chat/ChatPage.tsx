import { Eraser } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { useAssistant } from '@/stores/assistant'
import { EkkoFace } from '@/ui/EkkoFace'
import { IconButton } from '@/ui/primitives'
import { Composer } from './Composer'
import { ActionRow, AssistantBubble, UserBubble } from './MessageItems'
import { useChat } from './store'

const SUGGESTIONS = [
  'Que horas são?',
  'Timer de 5 minutos',
  'Abre o Spotify',
  'O que tem na minha tela?',
]

/** "Conversa": message list that scrolls, composer pinned to the bottom. */
export function ChatPage({ compact }: PageProps) {
  const { messages, streaming, clear } = useChat()
  const listRef = useRef<HTMLDivElement>(null)

  // Only touches DOM scroll; runs on every new word too, so streaming stays in view.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    // Cancel <main>'s padding so the list owns the scroll and the composer stays put.
    <div className="-m-4 flex h-[calc(100%+2rem)] flex-col">
      <header
        className={cn(
          'flex shrink-0 items-center justify-between gap-2 px-4 pt-3',
          compact ? 'pb-2' : 'pb-3',
        )}
      >
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold">Conversa</h1>
          {!compact && <p className="text-[12px] text-muted">Escreva, anexe um print ou fale.</p>}
        </div>
        <IconButton
          label="Limpar conversa"
          onClick={clear}
          disabled={messages.length === 0}
          className="disabled:opacity-40"
        >
          <Eraser className="size-4" />
        </IconButton>
      </header>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Mensagens"
        className="scroll-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-2"
      >
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <UserBubble key={m.id} message={m} />
            ) : m.role === 'assistant' ? (
              <AssistantBubble key={m.id} message={m} />
            ) : (
              <ActionRow key={m.id} message={m} />
            ),
          )
        )}
        {streaming && <Thinking />}
      </div>

      <div className="shrink-0 border-t border-border-soft/60 px-4 pt-2 pb-3">
        <Composer />
      </div>
    </div>
  )
}

/** Dots while the reply has not started streaming yet. */
function Thinking() {
  const phase = useAssistant((s) => s.phase)
  if (phase !== 'thinking') return null
  return (
    <div className="animate-fade-in flex items-center gap-2" aria-label="Pensando">
      <EkkoFace phase="thinking" className="size-6" />
      <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border-soft bg-surface px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="animate-bounce-dot size-1.5 rounded-full bg-accent"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyChat() {
  const send = useChat((s) => s.send)
  return (
    <div className="animate-rise-in m-auto flex flex-col items-center gap-3 py-4 text-center">
      <EkkoFace phase="idle" className="size-12" />
      <div>
        <div className="text-[14px] font-medium">Como posso ajudar?</div>
        <div className="label-hud mt-1">Sugestões</div>
      </div>
      <div className="flex max-w-sm flex-wrap justify-center gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              // The screen question goes out with a mock screenshot attached.
              if (s.includes('tela')) useChat.setState({ screenshot: true })
              send(s)
            }}
            className="rounded-full border border-border-soft px-3 py-1 text-[12px] text-muted transition-colors hover:border-accent/40 hover:text-content focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
