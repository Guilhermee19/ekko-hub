import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { Place, RainAlert, WeatherAlertEvent } from '@/lib/ipc'

export interface Sky {
  label: string
  icon: LucideIcon
}

/** WMO weather code → pt-BR label and icon. */
export function sky(code: number, isDay = true): Sky {
  if (code === 0) return { label: 'Céu limpo', icon: isDay ? Sun : Moon }
  if (code <= 2) return { label: 'Poucas nuvens', icon: isDay ? CloudSun : CloudMoon }
  if (code === 3) return { label: 'Nublado', icon: Cloud }
  if (code === 45 || code === 48) return { label: 'Neblina', icon: CloudFog }
  if (code >= 51 && code <= 57) return { label: 'Garoa', icon: CloudDrizzle }
  if (code === 65 || code === 67) return { label: 'Chuva forte', icon: CloudRain }
  if (code >= 61 && code <= 67) return { label: 'Chuva', icon: CloudRain }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { label: 'Neve', icon: CloudSnow }
  if (code === 82) return { label: 'Pancadas fortes', icon: CloudRain }
  if (code >= 80 && code <= 81) return { label: 'Pancadas de chuva', icon: CloudRain }
  if (code === 96 || code === 99) return { label: 'Tempestade com granizo', icon: CloudLightning }
  if (code === 95) return { label: 'Tempestade', icon: CloudLightning }
  return { label: 'Nublado', icon: Cloud }
}

export const degrees = (t: number) => `${Math.round(t)}°`

export const hhmm = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "São Paulo, SP"-like line for a search result. */
export function placeLabel(p: Place): string {
  return [p.name, p.region, p.country].filter(Boolean).join(', ')
}

/** "Tempestade às 16:00", "Chuva forte agora", "Chuva forte em 40 min". */
export function rainLine(a: RainAlert, now: number): string {
  const what = a.severity === 'storm' ? 'Tempestade' : 'Chuva forte'
  if (a.startMs <= now) return `${what} agora`
  const min = Math.round((a.startMs - now) / 60_000)
  if (min < 60) return `${what} em ${min} min`
  return `${what} às ${hhmm(a.startMs)}`
}

/** "14 mm · 85% · rajadas de 62 km/h · até 18:00" */
export function rainDetail(a: RainAlert): string {
  return [
    `${Math.round(a.precipMm)} mm`,
    a.probability !== null && `${a.probability}% de chance`,
    a.gustKmh >= 40 && `rajadas de ${Math.round(a.gustKmh)} km/h`,
    `até ${hhmm(a.endMs)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The notch card for a heavy-rain warning. */
export function rainAlertText(e: WeatherAlertEvent, now: number) {
  return {
    label: `Clima · ${e.place}`,
    title: rainLine(e.alert, now),
    detail: rainDetail(e.alert),
  }
}
