import { ListMusic } from 'lucide-react'
import { useSpotify } from '@/features/spotify/store'
import type { SpotifyTrack } from '@/lib/ipc'
import { EmptyState } from '@/ui/data'
import { coverOf } from './covers'
import { formatTime } from './time'

const NONE: SpotifyTrack[] = []

/** Spotify's "A seguir": clicking a row skips ahead to that track. */
export function QueueList({ limit }: { limit?: number }) {
  const queue = useSpotify((s) => s.queue?.queue ?? NONE)
  const skipTo = useSpotify((s) => s.skipTo)
  const items = limit ? queue.slice(0, limit) : queue
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-hud">A seguir no Spotify</span>
        <span className="font-mono text-[10px] text-muted tabular-nums">{queue.length} faixas</span>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Fila vazia"
          hint="Toque uma playlist ou álbum no Spotify para ver o que vem depois."
        />
      ) : (
        <ol className="flex flex-col gap-0.5">
          {items.map((t, i) => (
            <li key={`${t.id}-${i}`}>
              <button
                type="button"
                onClick={() => void skipTo(i)}
                aria-label={`Tocar ${t.title}, de ${t.artist}`}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="w-4 text-right font-mono text-[11px] text-muted tabular-nums">
                  {i + 1}
                </span>
                <span
                  aria-hidden
                  className="size-8 shrink-0 rounded-md"
                  style={{ background: coverOf(t.coverUrl, t.id) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{t.title}</span>
                  <span className="block truncate text-[11px] text-muted">{t.artist}</span>
                </span>
                <span className="font-mono text-[11px] text-muted tabular-nums">
                  {formatTime(Math.round(t.durationMs / 1000))}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
