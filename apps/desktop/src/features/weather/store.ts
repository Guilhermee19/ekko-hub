import { create } from 'zustand'
import { backend, type Forecast } from '@/lib/ipc'

// The forecast for the chosen city. The Rust poller fetches every 30 min and
// broadcasts it; every window keeps its own copy.

interface WeatherState {
  forecast: Forecast | null
  /** The first answer from the backend arrived. */
  loaded: boolean
}

export const useWeather = create<WeatherState>(() => ({ forecast: null, loaded: false }))

const report = (err: unknown) => console.warn('[ekko] clima', err)
const receive = (forecast: Forecast | null) => useWeather.setState({ forecast, loaded: true })

export function refreshWeather() {
  backend.weatherRefresh().catch(report)
}

backend.onWeatherChanged(receive).catch(report)
backend.weatherForecast().then(receive, report)
