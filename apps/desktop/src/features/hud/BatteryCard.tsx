import { BatteryMedium, Laptop } from 'lucide-react'
import { cn } from '@/lib/cn'
import { KIND_ICON, Ring } from './BatteryRing'
import { usePower, usePowerFeed } from './useSystemHud'

/** Início card: every battery Ekko sees, each with its icon in a donut of charge. */
const low = (it: { percent: number; charging: boolean }) => !it.charging && it.percent <= 20

export function BatteryCard() {
  usePowerFeed()
  const { battery, devices } = usePower()
  const items = [
    ...(battery
      ? [
          {
            key: 'laptop',
            name: 'Notebook',
            icon: Laptop,
            percent: battery.percent,
            charging: battery.plugged,
          },
        ]
      : []),
    ...devices.map((d) => ({
      key: d.name,
      name: d.name,
      icon: KIND_ICON[d.kind],
      percent: d.percent,
      charging: d.charging,
    })),
  ]
  return (
    <div className="flex h-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border-soft bg-surface p-3">
      <span className="flex items-center gap-1.5 text-muted">
        <BatteryMedium className="size-3.5" aria-hidden />
        <span className="label-hud">Bateria</span>
      </span>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted">
          Nenhuma bateria por aqui. Conecte um fone, mouse ou teclado sem fio.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {items.map((it) => (
            <li key={it.key} className="flex min-w-0 items-center gap-2">
              <Ring icon={it.icon} percent={it.percent} low={low(it)} />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[15px] font-semibold tabular-nums',
                    low(it) && 'text-danger',
                  )}
                >
                  {it.percent}%
                </span>
                <span className="block max-w-32 truncate text-[11px] text-muted">
                  {it.charging ? `${it.name} · carregando` : it.name}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
