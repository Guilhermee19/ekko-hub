import { describe, expect, it } from 'vitest'
import type { RainAlert } from '@/lib/ipc'
import { sampleForecast } from '@/lib/ipc/weatherMock'
import { degrees, placeLabel, rainAlertText, rainDetail, rainLine, sky } from './weather'

const now = new Date(2026, 10, 27, 13, 0).getTime()
const at = (h: number, m = 0) => new Date(2026, 10, 27, h, m).getTime()

const rain = (over: Partial<RainAlert> = {}): RainAlert => ({
  severity: 'heavy-rain',
  startMs: at(16),
  endMs: at(18),
  precipMm: 13.6,
  probability: 85,
  gustKmh: 62,
  ...over,
})

describe('weather helpers', () => {
  it('names the sky', () => {
    expect(sky(0).label).toBe('Céu limpo')
    expect(sky(0, false).icon).not.toBe(sky(0, true).icon)
    expect(sky(65).label).toBe('Chuva forte')
    expect(sky(63).label).toBe('Chuva')
    expect(sky(82).label).toBe('Pancadas fortes')
    expect(sky(95).label).toBe('Tempestade')
    expect(sky(99).label).toBe('Tempestade com granizo')
    expect(sky(42).label).toBe('Nublado')
  })

  it('formats places and degrees', () => {
    expect(degrees(21.6)).toBe('22°')
    expect(
      placeLabel({ name: 'Curitiba', region: 'Paraná', country: 'Brasil', lat: 0, lon: 0 }),
    ).toBe('Curitiba, Paraná, Brasil')
    expect(placeLabel({ name: 'X', region: '', country: 'Y', lat: 0, lon: 0 })).toBe('X, Y')
  })

  it('says when the rain comes', () => {
    expect(rainLine(rain(), now)).toBe('Chuva forte às 16:00')
    expect(rainLine(rain({ severity: 'storm', startMs: at(13, 40) }), now)).toBe(
      'Tempestade em 40 min',
    )
    expect(rainLine(rain({ startMs: at(12) }), now)).toBe('Chuva forte agora')
  })

  it('details the warning', () => {
    expect(rainDetail(rain())).toBe('14 mm · 85% de chance · rajadas de 62 km/h · até 18:00')
    expect(rainDetail(rain({ probability: null, gustKmh: 20 }))).toBe('14 mm · até 18:00')
    const text = rainAlertText({ alert: rain(), place: 'Curitiba' }, now)
    expect(text.label).toBe('Clima · Curitiba')
  })

  it('the gallery forecast has a storm ahead', () => {
    const f = sampleForecast(now)
    expect(f.hours).toHaveLength(24)
    expect(f.nextRain?.severity).toBe('storm')
    expect(f.nextRain!.startMs).toBeGreaterThan(now)
  })
})
