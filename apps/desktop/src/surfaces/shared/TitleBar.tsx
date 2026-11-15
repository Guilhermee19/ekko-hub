import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, X } from 'lucide-react'
import { isTauri } from '@/lib/ipc'

/** Custom title bar for the opaque windows (hub, settings): drag region + min/close. */
export function TitleBar({ title }: { title: string }) {
  const win = () => getCurrentWindow()
  return (
    <div
      data-tauri-drag-region
      className="no-select relative z-30 flex h-9 shrink-0 items-center gap-2 border-b border-border-soft bg-surface/60 pl-3 backdrop-blur-sm"
    >
      <span className="hud-glow size-1.5 rounded-full bg-accent text-accent" />
      <span
        data-tauri-drag-region
        className="flex-1 text-[11px] tracking-[0.22em] text-muted uppercase"
      >
        {title}
      </span>
      {isTauri && (
        <>
          <button
            type="button"
            aria-label="Minimizar"
            onClick={() => void win().minimize()}
            className="grid h-9 w-11 place-items-center text-muted hover:bg-surface-hover hover:text-content"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => void win().close()}
            className="grid h-9 w-11 place-items-center text-muted hover:bg-danger/80 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </>
      )}
    </div>
  )
}
