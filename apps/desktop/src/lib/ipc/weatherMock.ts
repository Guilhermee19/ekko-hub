import type { Unlisten } from './types'
import {
  WEATHER_ALERT,
  WEATHER_CHANGED,
  type Forecast,
  type Place,
  type WeatherAlertEvent,
  type WeatherBackend,
  type WeatherHour,
  type WeatherSettings,
} from './weatherTypes'

// Gallery stand-in: a few cities to search and a made-up day with a storm in the
// afternoon, so the card and the warning have something to show.

const HOUR = 3_600_000

const CITIES: Place[] = [
  { name: 'São Paulo', region: 'São Paulo', country: 'Brasil', lat: -23.55, lon: -46.63 },
  { name: 'Curitiba', region: 'Paraná', country: 'Brasil', lat: -25.43, lon: -49.27 },
  { name: 'Rio de Janeiro', region: 'Rio de Janeiro', country: 'Brasil', lat: -22.91, lon: -43.17 },
  { name: 'Belo Horizonte', region: 'Minas Gerais', country: 'Brasil', lat: -19.92, lon: -43.94 },
  {
    name: 'Porto Alegre',
    region: 'Rio Grande do Sul',
    country: 'Brasil',
    lat: -30.03,
    lon: -51.23,
  },
]

/** Clear morning, a storm 3 hours from now, drizzle after. */
export function sampleForecast(now = Date.now()): Forecast {
  const start = Math.floor(now / HOUR) * HOUR
  const codes = [1, 2, 3, 95, 65, 61, 51, 3, 2, 1, 0, 0]
  const hours: WeatherHour[] = Array.from({ length: 24 }, (_, i) => {
    const code = codes[i] ?? 1
    const wet = code >= 61
    return {
      timeMs: start + i * HOUR,
      temp: Math.round(24 - Math.abs(i - 4) * 0.8),
      code,
      precipMm: code === 95 ? 14 : code === 65 ? 9 : wet ? 1.2 : 0,
      probability: wet ? 85 : 10,
      gustKmh: code === 95 ? 62 : 18,
    }
  })
  return {
    updatedMs: now,
    temp: 23,
    feelsLike: 24,
    code: 2,
    isDay: true,
    min: 17,
    max: 26,
    hours,
    nextRain: {
      severity: 'storm',
      startMs: start + 3 * HOUR,
      endMs: start + 5 * HOUR,
      precipMm: 23,
      probability: 85,
      gustKmh: 62,
    },
  }
}

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function mockWeather(deps: {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
  weather: () => WeatherSettings
  patch: (change: { weather: WeatherSettings }) => Promise<void>
}): WeatherBackend {
  const forecast = () => (deps.weather().place ? sampleForecast() : null)
  return {
    weatherForecast: () => Promise.resolve(forecast()),
    weatherRefresh: () => {
      deps.fire(WEATHER_CHANGED, forecast())
      return Promise.resolve()
    },
    weatherSearch: (query) => {
      const q = strip(query.trim())
      return Promise.resolve(q.length < 2 ? [] : CITIES.filter((c) => strip(c.name).includes(q)))
    },
    setWeather: async (weather) => {
      const had = deps.weather().place
      await deps.patch({ weather })
      deps.fire(WEATHER_CHANGED, forecast())
      // A city just chosen: show what the warning looks like.
      const f = forecast()
      if (!had && weather.place && weather.alerts && f?.nextRain) {
        const e: WeatherAlertEvent = { alert: f.nextRain, place: weather.place.name }
        deps.fire(WEATHER_ALERT, e)
      }
    },
    onWeatherChanged: (cb) => deps.on(WEATHER_CHANGED, (p) => cb(p as Forecast | null)),
    onWeatherAlert: (cb) => deps.on(WEATHER_ALERT, (p) => cb(p as WeatherAlertEvent)),
  }
}
