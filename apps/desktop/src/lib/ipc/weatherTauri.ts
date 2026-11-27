import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  WEATHER_ALERT,
  WEATHER_CHANGED,
  type Forecast,
  type WeatherAlertEvent,
  type WeatherBackend,
} from './weatherTypes'

export const tauriWeather: WeatherBackend = {
  weatherForecast: () => invoke('weather_forecast'),
  weatherRefresh: () => invoke('weather_refresh'),
  weatherSearch: (query) => invoke('weather_search', { query }),
  setWeather: (weather) => invoke('set_weather', { weather }),
  onWeatherChanged: (cb) => listen<Forecast | null>(WEATHER_CHANGED, (e) => cb(e.payload)),
  onWeatherAlert: (cb) => listen<WeatherAlertEvent>(WEATHER_ALERT, (e) => cb(e.payload)),
}
