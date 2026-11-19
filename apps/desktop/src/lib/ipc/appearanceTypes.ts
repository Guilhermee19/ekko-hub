// Mirrors crates/ekko-core/src/appearance.rs.

export type SurfaceTone = 'default' | 'darker' | 'tinted'
export type ReduceMotion = 'system' | 'on' | 'off'
/** Live activities competing for the pill; the first active one in the list wins. */
export type PillItem = 'timer' | 'event' | 'music'
export type AvatarStyle = 'pill' | 'round' | 'line' | 'pixel' | 'visor'
export type AvatarColor = 'accent' | 'strong' | 'neutral'

export interface PillShow {
  avatar: boolean
  statusDot: boolean
  clock: boolean
  timer: boolean
  music: boolean
  event: boolean
}

/** Panel menu pages (ids from `surfaces/panel/nav.ts`). */
export interface PanelMenu {
  /** User order; pages not listed follow in the default order. */
  order: string[]
  hidden: string[]
}

export interface AppearanceSettings {
  /** Custom `#rrggbb` accent; null keeps the persona accent. */
  accent: string | null
  surfaceTone: SurfaceTone
  /** Pill bottom radius, px (6..28). */
  notchRadius: number
  /** Pill background alpha (0.6..1). */
  notchOpacity: number
  /** Accent border/glow intensity (0..1). */
  notchGlow: number
  /** Pill size multiplier (0.85..1.25). */
  notchScale: number
  notchBorder: boolean
  pillShow: PillShow
  pillPriority: PillItem[]
  /** Full windows scale (0.9..1.15). */
  fontScale: number
  reduceMotion: ReduceMotion
  avatarStyle: AvatarStyle
  avatarColor: AvatarColor
  panelMenu: PanelMenu
  /** Home cards in order (`features/home/catalog.ts`); null = default set. */
  homeCards: string[] | null
}

export const APPEARANCE_LIMITS = {
  notchRadius: [6, 28],
  notchOpacity: [0.6, 1],
  notchGlow: [0, 1],
  notchScale: [0.85, 1.25],
  fontScale: [0.9, 1.15],
} as const

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: null,
  surfaceTone: 'default',
  notchRadius: 18,
  notchOpacity: 1,
  notchGlow: 0.25,
  notchScale: 1,
  notchBorder: true,
  pillShow: { avatar: true, statusDot: true, clock: false, timer: true, music: true, event: true },
  pillPriority: ['timer', 'event', 'music'],
  fontScale: 1,
  reduceMotion: 'system',
  avatarStyle: 'pill',
  avatarColor: 'accent',
  panelMenu: { order: [], hidden: [] },
  homeCards: null,
}
