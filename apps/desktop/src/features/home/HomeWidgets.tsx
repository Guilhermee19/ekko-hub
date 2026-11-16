import { MessageSquare, Music2, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { useChat } from '@/features/chat/store'
import { useMusic } from '@/features/music/store'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { IconButton } from '@/ui/primitives'

/** Mini player (Kobi home): cover, title, controls; opens Música. */
export function NowPlaying({ go, compact }: PageProps) {
  const { track, playing, toggle, next, prev, source } = useMusic()
  if (!track) {
    return (
      <button
        type="button"
        onClick={() => go('music')}
        className="flex min-w-0 items-center gap-2 rounded-xl border border-border-soft bg-surface p-2.5 text-left"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-muted">
          <Music2 className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">Nada tocando agora</span>
          <span className="block truncate text-[11px] text-muted">Dê play em qualquer player</span>
        </span>
      </button>
    )
  }
  const details = [track.artist, source].filter(Boolean).join(' · ')
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border-soft bg-surface p-2.5">
      <button
        type="button"
        aria-label="Abrir Música"
        onClick={() => go('music')}
        className="size-11 shrink-0 rounded-lg"
        style={{ background: track.cover }}
      />
      <button type="button" onClick={() => go('music')} className="min-w-0 flex-1 text-left">
        <div className="truncate text-[13px] font-medium">{track.title}</div>
        <div className="truncate text-[11px] text-muted">{details}</div>
      </button>
      {!compact && (
        <IconButton label="Anterior" onClick={prev}>
          <SkipBack className="size-4" />
        </IconButton>
      )}
      <IconButton label={playing ? 'Pausar' : 'Tocar'} tone="accent" onClick={toggle}>
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </IconButton>
      <IconButton label="Próxima" onClick={next}>
        <SkipForward className="size-4" />
      </IconButton>
    </div>
  )
}

/** Last exchanges with Ekko; click opens the full conversation. */
export function RecentChat({ go }: Pick<PageProps, 'go'>) {
  const messages = useChat((s) => s.messages)
  const recent = messages.filter((m) => m.role !== 'action').slice(-2)
  if (recent.length === 0) return null
  return (
    <button
      type="button"
      onClick={() => go('chat')}
      className="flex flex-col gap-1.5 rounded-xl border border-border-soft bg-surface p-3 text-left transition-colors hover:border-accent/30"
    >
      <span className="flex items-center gap-1.5 text-muted">
        <MessageSquare className="size-3.5" />
        <span className="label-hud">Últimas mensagens</span>
      </span>
      {recent.map((m) => (
        <span
          key={m.id}
          className={cn('truncate text-[12px]', m.role === 'user' ? 'text-muted' : 'text-content')}
        >
          <span className="font-medium">{m.role === 'user' ? 'Você: ' : 'Ekko: '}</span>
          {m.text}
        </span>
      ))}
    </button>
  )
}
