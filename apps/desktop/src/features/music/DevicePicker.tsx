import { Check, ChevronDown, Laptop, Smartphone, Speaker, Tv } from 'lucide-react'
import { useState } from 'react'
import { useSpotify } from '@/features/spotify/store'
import { cn } from '@/lib/cn'

/** Static component so the icon choice stays outside render (react-hooks v7). */
function DeviceIcon({ kind, className }: { kind: string | undefined; className: string }) {
  if (kind === 'computer') return <Laptop className={className} />
  if (kind === 'smartphone' || kind === 'tablet') return <Smartphone className={className} />
  if (kind === 'tv') return <Tv className={className} />
  return <Speaker className={className} />
}

/** "Tocando em: …" pill that expands into the Spotify Connect devices. */
export function DevicePicker() {
  const devices = useSpotify((s) => s.devices)
  const playing = useSpotify((s) => s.playback?.device ?? null)
  const transfer = useSpotify((s) => s.transfer)
  const [open, setOpen] = useState(false)
  const current = devices.find((d) => d.active) ?? playing
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border-soft bg-base/60 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-accent/40"
      >
        <DeviceIcon kind={current?.kind} className="size-3.5 text-accent" />
        <span className="text-muted">Tocando em:</span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {current?.name ?? 'nenhum dispositivo'}
        </span>
        <ChevronDown
          className={cn('size-3.5 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Dispositivos do Spotify"
          className="animate-rise-in absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-border-soft bg-surface p-1 shadow-lg"
        >
          {devices.length === 0 && (
            <li className="px-2 py-1.5 text-[12px] text-muted">
              Abra o Spotify em algum aparelho para ele aparecer aqui.
            </li>
          )}
          {devices.map((d) => {
            return (
              <li key={d.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={d.active}
                  onClick={() => {
                    if (!d.active) void transfer(d.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-surface-hover',
                    d.active ? 'text-accent' : 'text-content',
                  )}
                >
                  <DeviceIcon kind={d.kind} className="size-3.5" />
                  <span className="flex-1 truncate text-left">{d.name}</span>
                  {d.active && <Check className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
