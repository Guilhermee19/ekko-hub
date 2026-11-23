import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMusic } from './store'

/** Room the three buttons take in the notch pill (3 × 22 px + gaps + margins). */
export const MINI_TRANSPORT_W = 84

/** Tiny previous / play-pause / next for the notch pill, next to the song name. */
export function MiniTransport({ playing }: { playing: boolean }) {
  const { toggle, next, prev } = useMusic()
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <MiniButton label="Anterior" onClick={prev}>
        <SkipBack className="size-3 fill-current" />
      </MiniButton>
      <MiniButton label={playing ? 'Pausar' : 'Tocar'} onClick={toggle} strong>
        {playing ? (
          <Pause className="size-3 fill-current" />
        ) : (
          <Play className="size-3 translate-x-px fill-current" />
        )}
      </MiniButton>
      <MiniButton label="Próxima" onClick={next}>
        <SkipForward className="size-3 fill-current" />
      </MiniButton>
    </span>
  )
}

function MiniButton({
  label,
  onClick,
  strong = false,
  children,
}: {
  label: string
  onClick: () => void
  strong?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        // The pill opens the panel on click; the buttons only control the song.
        e.stopPropagation()
        onClick()
      }}
      className={
        strong
          ? 'grid size-5.5 place-items-center rounded-full bg-surface-hover text-content transition-colors hover:text-accent focus-visible:outline focus-visible:outline-accent'
          : 'grid size-5.5 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-content focus-visible:outline focus-visible:outline-accent'
      }
    >
      {children}
    </button>
  )
}
