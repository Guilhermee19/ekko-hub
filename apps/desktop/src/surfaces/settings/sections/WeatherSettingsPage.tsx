import { MapPin, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { placeLabel } from '@/features/weather/weather'
import { backend, DEFAULT_WEATHER, type Place, type WeatherSettings } from '@/lib/ipc'
import { useSettings } from '@/stores/settings'
import { Input, Toggle } from '@/ui/forms'
import { Card, IconButton } from '@/ui/primitives'
import { Field } from '../Field'
import { Chip, PageFrame } from './GeneralControls'

const LEADS = [1, 2, 3, 6]
/** Wait for a pause in typing before asking Open-Meteo. */
const DEBOUNCE_MS = 350

const useWeatherSettings = () => useSettings((s) => s.settings.weather ?? DEFAULT_WEATHER)

/** "Clima": the city for the card and when the notch warns about heavy rain. */
export function WeatherSettingsPage() {
  const weather = useWeatherSettings()
  const set = (v: Partial<WeatherSettings>) => void backend.setWeather({ ...weather, ...v })

  return (
    <PageFrame
      title="Clima"
      subtitle="A previsão vem da Open-Meteo, grátis e sem cadastro. O Ekko olha a cada 30 minutos e avisa no notch quando vem chuva forte."
    >
      <Field title="Cidade" hint="Usada no card Clima do Início e nos avisos de chuva.">
        {weather.place ? (
          <Card className="flex items-center gap-3">
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-[13px]">{placeLabel(weather.place)}</span>
            <IconButton label="Trocar de cidade" onClick={() => set({ place: null })}>
              <X className="size-4" aria-hidden />
            </IconButton>
          </Card>
        ) : (
          <CitySearch onPick={(place) => set({ place })} />
        )}
      </Field>

      <Field
        title="Aviso de chuva forte"
        hint="Um aviso por período de chuva, não a cada atualização. O Não perturbe segura o aviso."
      >
        <Card className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 text-[13px]">
            Avisar no notch
            <Toggle
              checked={weather.alerts}
              label="Avisar no notch"
              onChange={(alerts) => set({ alerts })}
            />
          </label>
          <Row label="Com antecedência de">
            {LEADS.map((h) => (
              <Chip
                key={h}
                active={weather.leadHours === h}
                disabled={!weather.alerts}
                onClick={() => set({ leadHours: h })}
              >
                {h} h
              </Chip>
            ))}
          </Row>
          <Row label="Avisar sobre">
            <Chip
              active={weather.level === 'heavy-rain'}
              disabled={!weather.alerts}
              onClick={() => set({ level: 'heavy-rain' })}
            >
              Chuva forte e tempestade
            </Chip>
            <Chip
              active={weather.level === 'storm'}
              disabled={!weather.alerts}
              onClick={() => set({ level: 'storm' })}
            >
              Só tempestade
            </Chip>
          </Row>
        </Card>
      </Field>
    </PageFrame>
  )
}

function CitySearch({ onPick }: { onPick: (place: Place) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    const id = setTimeout(() => {
      backend.weatherSearch(query).then(
        (found) => {
          if (!alive) return
          setResults(found)
          setError(false)
        },
        () => alive && setError(true),
      )
    }, DEBOUNCE_MS)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [query])

  const typed = query.trim().length >= 2
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome da cidade"
          aria-label="Buscar cidade"
          className="pl-8"
        />
      </div>
      {error && <p className="text-[12px] text-danger">Não deu para buscar. Confira a internet.</p>}
      {typed && !error && results.length === 0 && (
        <p className="text-[12px] text-muted">Nenhuma cidade encontrada.</p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((p) => (
            <li key={`${p.lat},${p.lon}`}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-2 rounded-lg border border-border-soft px-3 py-2 text-left text-[13px] transition-colors hover:border-accent/40 hover:bg-accent/5"
              >
                <MapPin className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate">{placeLabel(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
