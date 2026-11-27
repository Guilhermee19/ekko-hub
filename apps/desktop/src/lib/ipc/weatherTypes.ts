// Mirrors crates/ekko-core/src/weather.rs, crates/ekko-integrations/src/weather and
// services/weather.rs (Open-Meteo forecast and heavy-rain warnings).

export const WEATHER_CHANGED = 'ekko://weather/changed'
export const WEATHER_ALERT = 'ekko://weather/alert'

export interface Place {
  name: string
  /** State or province; empty when unknown. */
  region: string
  country: string
  lat: number
  lon: number
}

export type RainLevel = 'heavy-rain' | 'storm'

export interface WeatherSettings {
  place: Place | null
  /** Warn in the notch about heavy rain coming. */
  alerts: boolean
  /** How far ahead, 1..6 hours. */
  leadHours: number
  level: RainLevel
}

export const DEFAULT_WEATHER: WeatherSettings = {
  place: null,
  alerts: true,
  leadHours: 2,
  level: 'heavy-rain',
}

export type RainSeverity = 'heavy-rain' | 'storm'

export interface WeatherHour {
  timeMs: number
  temp: number
  /** WMO weather code. */
  code: number
  precipMm: number
  probability: number | null
  gustKmh: number
}

/** A run of consecutive heavy-rain or storm hours. */
export interface RainAlert {
  severity: RainSeverity
  startMs: number
  endMs: number
  precipMm: number
  probability: number | null
  gustKmh: number
}

export interface Forecast {
  updatedMs: number
  temp: number
  feelsLike: number
  code: number
  isDay: boolean
  min: number
  max: number
  /** From the current hour on, up to 24. */
  hours: WeatherHour[]
  /** Next heavy rain or storm in 24 h. */
  nextRain: RainAlert | null
}

export interface WeatherAlertEvent {
  alert: RainAlert
  place: string
}

type Unlisten = () => void

export interface WeatherBackend {
  /** Null while no city is chosen or before the first answer. */
  weatherForecast(): Promise<Forecast | null>
  weatherRefresh(): Promise<void>
  /** Cities matching the text (2+ letters). */
  weatherSearch(query: string): Promise<Place[]>
  setWeather(weather: WeatherSettings): Promise<void>
  onWeatherChanged(cb: (forecast: Forecast | null) => void): Promise<Unlisten>
  onWeatherAlert(cb: (e: WeatherAlertEvent) => void): Promise<Unlisten>
}
