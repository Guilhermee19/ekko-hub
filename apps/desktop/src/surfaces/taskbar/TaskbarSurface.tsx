import { MiniTransport } from '@/features/music/MiniTransport'
import { useMusic } from '@/features/music/store'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useAssistant, type Phase } from '@/stores/assistant'
import { useSettings } from '@/stores/settings'
import { EkkoEyes } from '@/ui/EkkoEyes'

const STATUS: Record<Phase, string> = {
  idle: 'Clique para abrir',
  listening: 'Ouvindo…',
  thinking: 'Pensando…',
  speaking: 'Falando…',
}

/**
 * Widget inside the Windows taskbar (FluentFlyout-style): the song playing, with
 * previous / play / next, or Ekko's eyes when nothing plays. Click opens the panel.
 */
export function TaskbarSurface({ onOpen }: { onOpen?: () => void }) {
  const phase = useAssistant((s) => s.phase)
  const hasActivity = useAssistant((s) => Boolean(s.activity || s.toast))
  const name = useSettings((s) => s.settings.assistantName)
  const track = useMusic((s) => s.track)
  const playing = useMusic((s) => s.playing)
  const busy = phase !== 'idle'
  const showTrack = track && !busy

  return (
    <div className="no-select flex h-full w-full items-center p-1">
      <div
        role="button"
        tabIndex={0}
        aria-label="Abrir o Ekko"
        onClick={onOpen ?? (() => void backend.summon())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') (onOpen ?? (() => void backend.summon()))()
        }}
        className={cn(
          'flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-border-soft px-1.5',
          'bg-(--notch-ink)/85 transition-colors hover:border-accent/40',
          'focus-visible:outline focus-visible:outline-accent',
        )}
      >
        <span className="relative grid aspect-square h-[calc(100%-8px)] shrink-0 place-items-center overflow-hidden rounded-md">
          {showTrack ? (
            <span aria-hidden className="size-full" style={{ background: track.cover }} />
          ) : (
            <span
              className={cn(
                'ekko-glow grid size-full place-items-center rounded-md',
                phase === 'listening' && 'ring-1 ring-danger/60',
              )}
            >
              <EkkoEyes phase={phase} className="h-2.5 w-6" />
            </span>
          )}
          {hasActivity && (
            <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-accent" />
          )}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12px] font-medium text-content">
            {showTrack ? track.title : name}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {showTrack ? track.artist : STATUS[phase]}
          </span>
        </span>
        {showTrack && <MiniTransport playing={playing} />}
      </div>
    </div>
  )
}
