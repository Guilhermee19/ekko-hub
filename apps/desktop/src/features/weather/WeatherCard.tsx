import { CloudSun, TriangleAlert } from 'lucide-react'
import { backend } from '@/lib/ipc'
import { cn } from '@/lib/cn'
import { useSettings } from '@/stores/settings'
import { useNow } from '@/surfaces/shared/useNow'
import { useWeather } from './store'
import { degrees, hhmm, rainLine, sky } from './weather'

/** Hours shown in the strip of a wide card. */
const STRIP = 6

/** Início card: the weather now, today's range, the next heavy rain and the next hours. */
export function WeatherCard() {
  const place = useSettings((s) => s.settings.weather.place)
  const forecast = useWeather((s) => s.forecast)
  const now = useNow(true, 60_000)
  const open = () => void backend.openSettings()

  const frame =
    '@container flex h-full w-full min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border border-border-soft bg-surface p-3 text-left transition-colors hover:border-accent/30 hover:bg-surface-hover'

  if (!place || !forecast) {
    return (
      <button type="button" onClick={open} className={frame}>
        <Header place={place?.name} />
        <span className="truncate text-[13px] font-medium">
          {place ? 'Buscando a previsão…' : 'Escolha sua cidade'}
        </span>
        <span className="line-clamp-2 text-[11px] text-muted">
          {place ? 'Leva alguns segundos.' : 'Em Configurações → Clima.'}
        </span>
      </button>
    )
  }

  const current = sky(forecast.code, forecast.isDay)
  const Icon = current.icon
  const rain = forecast.nextRain && forecast.nextRain.endMs > now ? forecast.nextRain : null
  const hours = forecast.hours.filter((h) => h.timeMs > now).slice(0, STRIP)

  return (
    <button type="button" onClick={open} className={frame}>
      <Header place={place.name} />
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="size-7 shrink-0 text-accent" aria-hidden />
        <span className="text-[22px] leading-none font-semibold tabular-nums">
          {degrees(forecast.temp)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[12px]">{current.label}</span>
          <span className="truncate text-[11px] text-muted tabular-nums">
            {degrees(forecast.min)} / {degrees(forecast.max)}
          </span>
        </span>
      </span>
      {rain ? (
        <span
          className={cn(
            'flex min-w-0 items-center gap-1 text-[11px] font-medium',
            rain.severity === 'storm' ? 'text-danger' : 'text-accent',
          )}
        >
          <TriangleAlert className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{rainLine(rain, now)}</span>
        </span>
      ) : (
        <span className="truncate text-[11px] text-muted">Sem chuva forte nas próximas 24 h</span>
      )}
      {/* Wide cards (2+ columns) get the next hours. */}
      <span className="mt-auto hidden gap-1 @[16rem]:flex">
        {hours.map((h) => {
          const HourIcon = sky(h.code).icon
          return (
            <span key={h.timeMs} className="flex flex-1 flex-col items-center gap-0.5">
              <span className="text-[10px] text-muted tabular-nums">{hhmm(h.timeMs)}</span>
              <HourIcon className="size-3.5 text-muted" aria-hidden />
              <span className="text-[11px] tabular-nums">{degrees(h.temp)}</span>
            </span>
          )
        })}
      </span>
    </button>
  )
}

function Header({ place }: { place?: string }) {
  return (
    <span className="flex w-full min-w-0 items-center gap-1.5 text-muted">
      <CloudSun className="size-3.5 shrink-0" aria-hidden />
      <span className="label-hud truncate">{place ? `Clima · ${place}` : 'Clima'}</span>
    </span>
  )
}
