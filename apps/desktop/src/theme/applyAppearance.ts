import type { AppearanceSettings, Persona } from '@/lib/ipc'
import { contrast, darken, mix, normalizeHex } from './color'
import { PALETTES, type Palette } from './palettes'

/** Every CSS variable this module may set; the rest are removed so tokens.css wins. */
const MANAGED = [
  '--color-accent',
  '--color-accent-strong',
  '--color-base',
  '--color-surface',
  '--color-surface-hover',
  '--color-border-soft',
  '--notch-radius',
  '--notch-opacity',
  '--notch-glow',
  '--notch-scale',
  '--notch-bg',
  '--notch-border',
  '--notch-shadow',
  '--font-scale',
] as const

type Vars = Partial<Record<(typeof MANAGED)[number], string>>

/** Persona accent unless a valid custom one is set. */
export function effectiveAccent(persona: Persona, a: AppearanceSettings): string {
  return (a.accent && normalizeHex(a.accent)) ?? PALETTES[persona].accent
}

/** Base color after the surface tone (what the accent sits on). */
export function effectiveBase(persona: Persona, a: AppearanceSettings): string {
  return toned(PALETTES[persona], a, effectiveAccent(persona, a)).base
}

/** Contrast of the accent over the base, 1..21 (shown live in the color picker). */
export function accentContrast(persona: Persona, a: AppearanceSettings): number {
  return contrast(effectiveAccent(persona, a), effectiveBase(persona, a))
}

function toned(p: Palette, a: AppearanceSettings, accent: string): Palette {
  if (a.surfaceTone === 'darker') {
    return {
      ...p,
      base: mix(p.base, '#000000', 0.5),
      surface: mix(p.surface, '#000000', 0.35),
      surfaceHover: mix(p.surfaceHover, '#000000', 0.25),
    }
  }
  if (a.surfaceTone === 'tinted') {
    return {
      ...p,
      base: mix(p.base, accent, 0.05),
      surface: mix(p.surface, accent, 0.08),
      surfaceHover: mix(p.surfaceHover, accent, 0.1),
      borderSoft: mix(p.borderSoft, accent, 0.2),
    }
  }
  return p
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/** Pure: settings → CSS variables. Colors only appear when they differ from tokens.css. */
export function appearanceVars(persona: Persona, a: AppearanceSettings): Vars {
  const vars: Vars = {}
  const custom = a.accent ? normalizeHex(a.accent) : null
  const accent = custom ?? PALETTES[persona].accent
  if (custom) {
    vars['--color-accent'] = custom
    vars['--color-accent-strong'] = darken(custom)
  }
  if (a.surfaceTone !== 'default') {
    const t = toned(PALETTES[persona], a, accent)
    vars['--color-base'] = t.base
    vars['--color-surface'] = t.surface
    vars['--color-surface-hover'] = t.surfaceHover
    vars['--color-border-soft'] = t.borderSoft
  }
  // The border alpha tracks the glow so one slider drives the whole "neon" feel.
  const glow = a.notchGlow
  vars['--notch-radius'] = `${a.notchRadius}px`
  vars['--notch-opacity'] = String(a.notchOpacity)
  vars['--notch-glow'] = String(glow)
  vars['--notch-scale'] = String(a.notchScale)
  vars['--notch-bg'] = `color-mix(in srgb, var(--color-base) ${pct(a.notchOpacity)}, transparent)`
  vars['--notch-border'] = a.notchBorder
    ? `color-mix(in srgb, var(--color-accent) ${pct(0.05 + glow * 0.4)}, transparent)`
    : 'transparent'
  vars['--notch-shadow'] =
    glow > 0
      ? `0 0 ${Math.round(glow * 24)}px color-mix(in srgb, var(--color-accent) ${pct(glow * 0.45)}, transparent)`
      : 'none'
  vars['--font-scale'] = String(a.fontScale)
  return vars
}

/** Writes the appearance on `<html>`; called whenever persona or appearance change. */
export function applyAppearance(
  persona: Persona,
  a: AppearanceSettings,
  root: HTMLElement = document.documentElement,
): void {
  const vars = appearanceVars(persona, a)
  for (const key of MANAGED) {
    const value = vars[key]
    if (value === undefined) root.style.removeProperty(key)
    else root.style.setProperty(key, value)
  }
  root.dataset.reduceMotion = a.reduceMotion
  if (accentContrast(persona, a) < 3) {
    console.warn('[ekko] accent com pouco contraste sobre o fundo:', effectiveAccent(persona, a))
  }
}
