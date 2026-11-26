import { mockBackend } from './mock'
import { currentWindowLabel, tauriBackend } from './tauri'
import type { Backend } from './types'

export * from './types'

/** True inside the Tauri webview; false in a plain browser (gallery). */
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const backend: Backend = isTauri ? tauriBackend : mockBackend

export type SurfaceId =
  | 'gallery'
  | 'notch'
  | 'panel'
  | 'orb'
  | 'dock'
  | 'hub'
  | 'voice'
  | 'settings'
  | 'palette'
  | 'onboarding'
  | 'alarm'
  | 'capture'
  | 'taskbar'

const SURFACES: SurfaceId[] = [
  'gallery',
  'notch',
  'panel',
  'orb',
  'dock',
  'hub',
  'voice',
  'settings',
  'palette',
  'onboarding',
  'alarm',
  'capture',
  'taskbar',
]

/** Tauri: window label decides. Browser: `?surface=` or the gallery. */
export function resolveSurface(): SurfaceId {
  const wanted = isTauri
    ? currentWindowLabel()
    : new URLSearchParams(window.location.search).get('surface')
  return SURFACES.find((s) => s === wanted) ?? 'gallery'
}
