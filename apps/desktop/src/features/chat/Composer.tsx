import { ImagePlus, Mic, SendHorizontal, Square, X } from 'lucide-react'
import { useState } from 'react'
import { demo } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { IconButton } from '@/ui/primitives'
import { ScreenshotThumb } from './MessageItems'
import { useChat } from './store'

/** Bottom input row: screenshot chip, text, attach, mic and send/stop. */
export function Composer() {
  const assistantName = useSettings((s) => s.settings.assistantName)
  const { streaming, screenshot, send, stop, toggleScreenshot } = useChat()
  const [draft, setDraft] = useState('')
  const canSend = !streaming && (draft.trim() !== '' || screenshot)

  const submit = () => {
    if (!canSend) return
    send(draft)
    setDraft('')
  }

  return (
    <div className="rounded-xl border border-border-soft bg-base/60 p-1.5 focus-within:border-accent/50">
      {screenshot && (
        <div className="animate-fade-in mb-1.5 inline-flex items-center gap-2 rounded-lg border border-border-soft bg-surface py-1 pr-1 pl-1">
          <ScreenshotThumb className="h-7 w-11" />
          <span className="text-[11px] text-muted">print da tela</span>
          <button
            type="button"
            aria-label="Remover print da tela"
            onClick={toggleScreenshot}
            className="grid size-5 place-items-center rounded-full text-muted hover:bg-surface-hover hover:text-content focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-1">
        <IconButton label="Anexar print da tela" active={screenshot} onClick={toggleScreenshot}>
          <ImagePlus className="size-4" />
        </IconButton>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          aria-label={`Mensagem para o ${assistantName}`}
          placeholder={screenshot ? 'Pergunte sobre o print…' : `Fale com o ${assistantName}…`}
          className="min-w-0 flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-muted"
        />
        <IconButton label="Falar" onClick={demo.listening}>
          <Mic className="size-4" />
        </IconButton>
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-danger/15 px-3 text-[12px] font-medium text-danger transition-colors hover:bg-danger/25 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
          >
            <Square className="size-3 fill-current" aria-hidden /> Parar
          </button>
        ) : (
          <IconButton
            label="Enviar"
            tone="accent"
            disabled={!canSend}
            onClick={submit}
            className="disabled:opacity-40"
          >
            <SendHorizontal className="size-4" />
          </IconButton>
        )}
      </div>
    </div>
  )
}
