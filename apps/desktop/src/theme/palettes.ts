import type { Persona } from '@/lib/ipc'

/**
 * JS copy of the persona colors in tokens.css, needed to derive tones and contrast
 * (CSS can't mix a variable into itself). palettes.test.ts keeps both in sync.
 */
export interface Palette {
  base: string
  surface: string
  surfaceHover: string
  borderSoft: string
  accent: string
  accentStrong: string
}

export const PALETTES: Record<Persona, Palette> = {
  ekko: {
    base: '#04070d',
    surface: '#0a121c',
    surfaceHover: '#111d2b',
    borderSoft: '#17293a',
    accent: '#5ec8ff',
    accentStrong: '#0b7fc0',
  },
  ultron: {
    base: '#0a0604',
    surface: '#150d06',
    surfaceHover: '#21150a',
    borderSoft: '#3a2611',
    accent: '#ff9c3f',
    accentStrong: '#b8560f',
  },
  tobby: {
    base: '#030a09',
    surface: '#08141a',
    surfaceHover: '#0f1f24',
    borderSoft: '#163033',
    accent: '#3fe0c5',
    accentStrong: '#0e9c86',
  },
}
