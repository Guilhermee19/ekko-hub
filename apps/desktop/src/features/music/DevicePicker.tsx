import { Check, ChevronDown, Laptop, Smartphone, Speaker, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { DEVICES } from './mock'
import { useMusic, type Device } from './store'

const ICONS: Record<Device['kind'], LucideIcon> = {
  desktop: Laptop,
  phone: Smartphone,
  speaker: Speaker,
}

/** "Tocando em: …" pill that expands into the list of Spotify Connect devices. */
export function DevicePicker() {
  const device = useMusic((s) => s.device)
  const setDevice = useMusic((s) => s.setDevice)
  const [open, setOpen] = useState(false)
  const Icon = ICONS[device.kind]
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border-soft bg-base/60 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:border-accent/40"
      >
        <Icon className="size-3.5 text-accent" />
        <span className="text-muted">Tocando em:</span>
        <span className="min-w-0 flex-1 truncate font-medium">{device.name}</span>
        <ChevronDown
          className={cn('size-3.5 text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Dispositivos"
          className="animate-rise-in absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-border-soft bg-surface p-1 shadow-lg"
        >
          {DEVICES.map((d) => {
            const DIcon = ICONS[d.kind]
            const active = d.id === device.id
            return (
              <li key={d.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setDevice(d.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-surface-hover',
                    active ? 'text-accent' : 'text-content',
                  )}
                >
                  <DIcon className="size-3.5" />
                  <span className="flex-1 text-left">{d.name}</span>
                  {active && <Check className="size-3.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
