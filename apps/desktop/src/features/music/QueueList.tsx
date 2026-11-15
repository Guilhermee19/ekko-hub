import { ListMusic } from 'lucide-react'
import { EmptyState } from '@/ui/data'
import { useMusic } from './store'
import { formatTime } from './time'

/** "A seguir": clicking a row jumps straight to that track. */
export function QueueList({ limit }: { limit?: number }) {
  const queue = useMusic((s) => s.queue)
  const playFromQueue = useMusic((s) => s.playFromQueue)
  const items = limit ? queue.slice(0, limit) : queue
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label-hud">A seguir</span>
        <span className="font-mono text-[10px] text-muted tabular-nums">{queue.length} faixas</span>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Fila vazia"
          hint="Peça uma música ou playlist ao assistente."
        />
      ) : (
        <ol className="flex flex-col gap-0.5">
          {items.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => playFromQueue(t.id)}
                aria-label={`Tocar ${t.title}, de ${t.artist}`}
                className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <span className="w-4 text-right font-mono text-[11px] text-muted tabular-nums">
                  {i + 1}
                </span>
                <span
                  aria-hidden
                  className="size-8 shrink-0 rounded-md"
                  style={{ background: t.cover }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{t.title}</span>
                  <span className="block truncate text-[11px] text-muted">{t.artist}</span>
                </span>
                <span className="font-mono text-[11px] text-muted tabular-nums">
                  {formatTime(t.durationSec)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
