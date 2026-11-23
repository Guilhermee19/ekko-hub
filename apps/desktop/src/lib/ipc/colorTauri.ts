import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  COLOR_PICKED,
  COLORS_CHANGED,
  type ColorBackend,
  type ColorHistory,
  type PickedColor,
} from './colorTypes'

export const tauriColor: ColorBackend = {
  colorStart: () => invoke('color_start'),
  colorLoupe: (x, y) => invoke('color_loupe', { x, y }),
  colorPick: (x, y) => invoke('color_pick', { x, y }),
  colorCopy: (text) => invoke('color_copy', { text }),
  colorHistory: () => invoke('color_history'),
  colorSave: (hex) => invoke('color_save', { hex }),
  colorRemove: (hex) => invoke('color_remove', { hex }),
  colorClear: () => invoke('color_clear'),
  onColorPicked: (cb) => listen<{ color: PickedColor }>(COLOR_PICKED, (e) => cb(e.payload.color)),
  onColorsChanged: (cb) => listen<ColorHistory>(COLORS_CHANGED, (e) => cb(e.payload)),
}
