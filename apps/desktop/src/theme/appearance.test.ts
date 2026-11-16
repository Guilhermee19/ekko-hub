import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APPEARANCE, type AppearanceSettings } from '@/lib/ipc'
import { accentContrast, appearanceVars, applyAppearance } from './applyAppearance'
import { contrast, darken, luminance, mix, normalizeHex, parseHex, toHex } from './color'
import { PALETTES } from './palettes'

const look = (patch: Partial<AppearanceSettings>) => ({ ...DEFAULT_APPEARANCE, ...patch })

describe('color math', () => {
  it('parses and normalizes hex', () => {
    expect(normalizeHex('#5EC8FF')).toBe('#5ec8ff')
    expect(normalizeHex('a1b2c3')).toBe('#a1b2c3')
    expect(normalizeHex('#fff')).toBeNull()
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('nope')).toBeNull()
    expect(toHex([255, 128, 0])).toBe('#ff8000')
  })

  it('mixes and darkens', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    const strong = darken('#5ec8ff')
    expect(luminance(strong)).toBeLessThan(luminance('#5ec8ff'))
    // Same family as the hand-picked persona pair (#0b7fc0): mostly blue, darker.
    const [r, g, b] = parseHex(strong)!
    expect(b).toBeGreaterThan(g)
    expect(g).toBeGreaterThan(r)
  })

  it('computes WCAG contrast', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#777777', '#777777')).toBe(1)
    expect(contrast(PALETTES.ekko.accent, PALETTES.ekko.base)).toBeGreaterThan(7)
  })
})

describe('appearanceVars', () => {
  it('leaves persona colors alone by default', () => {
    const v = appearanceVars('ekko', DEFAULT_APPEARANCE)
    expect(v['--color-accent']).toBeUndefined()
    expect(v['--color-base']).toBeUndefined()
    expect(v['--notch-radius']).toBe('18px')
  })

  it('overrides accent and derives the strong tone', () => {
    const v = appearanceVars('ekko', look({ accent: '#FF00AA' }))
    expect(v['--color-accent']).toBe('#ff00aa')
    expect(v['--color-accent-strong']).toBe(darken('#ff00aa'))
  })

  it('tints and darkens surfaces', () => {
    const tinted = appearanceVars('ekko', look({ surfaceTone: 'tinted' }))
    expect(tinted['--color-surface']).not.toBe(PALETTES.ekko.surface)
    const darker = appearanceVars('ekko', look({ surfaceTone: 'darker' }))
    expect(luminance(darker['--color-base']!)).toBeLessThan(luminance(PALETTES.ekko.base))
  })

  it('drops the border when disabled', () => {
    expect(appearanceVars('eco', look({ notchBorder: false }))['--notch-border']).toBe(
      'transparent',
    )
  })

  it('flags a dark accent', () => {
    expect(accentContrast('ekko', look({ accent: '#101010' }))).toBeLessThan(3)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const style = { setProperty: vi.fn(), removeProperty: vi.fn() }
    const root = { style, dataset: {} } as unknown as HTMLElement
    applyAppearance('ekko', look({ accent: '#101010', reduceMotion: 'on' }), root)
    expect(warn).toHaveBeenCalled()
    expect(root.dataset.reduceMotion).toBe('on')
    expect(style.setProperty).toHaveBeenCalledWith('--color-accent', '#101010')
    warn.mockRestore()
  })
})

it('palettes.ts mirrors tokens.css', () => {
  const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')
  for (const p of Object.values(PALETTES)) {
    for (const hex of Object.values(p)) expect(tokens).toContain(hex)
  }
})
