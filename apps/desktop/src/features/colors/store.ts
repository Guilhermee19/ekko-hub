import { create } from 'zustand'
import { backend, type PickedColor } from '@/lib/ipc'
import { flashToast } from '@/stores/assistant'

// Picked colors (Início card, notch alert): the backend keeps them in colors.json and
// pushes every change, so all windows show the same history.

interface ColorsState {
  colors: PickedColor[]
  loaded: boolean
}

export const useColors = create<ColorsState>(() => ({ colors: [], loaded: false }))

let started = false

/** Loads the history once and follows its changes. */
export function watchColors() {
  if (started) return
  started = true
  void backend.colorHistory().then((h) => useColors.setState({ colors: h.colors, loaded: true }))
  void backend.onColorsChanged((h) => useColors.setState({ colors: h.colors, loaded: true }))
}

/** Opens the eyedropper. `delayMs` lets a closing window get out of the shot first. */
export function pickColor(delayMs = 0) {
  window.setTimeout(() => {
    backend.colorStart().catch((e: unknown) => flashToast(`Não deu para pegar a cor: ${e}`))
  }, delayMs)
}

/** Copies a color code and says so. */
export function copyColor(text: string) {
  backend.colorCopy(text).then(
    () => flashToast(`${text} copiado`),
    () => flashToast('Não deu para copiar agora, tente de novo'),
  )
}
