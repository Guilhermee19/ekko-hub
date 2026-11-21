import type { Unlisten } from './types'
import type { UpdateBackend, UpdateProgress } from './updateTypes'

// Browser gallery: pretends a newer version is out and "downloads" it, so the Sobre
// page can be tried without Tauri. Nothing is downloaded or installed.

const CURRENT = '0.4.0'
const SIZE = 4_398_744

export function mockUpdate(): UpdateBackend {
  const listeners = new Set<(p: UpdateProgress) => void>()
  return {
    appVersion: async () => CURRENT,
    updateCheck: async () => {
      await new Promise((r) => setTimeout(r, 700))
      return {
        current: CURRENT,
        latest: '0.5.0',
        available: true,
        notes: 'Temas de época, todos os modos com o visual do notch e atualização com um clique.',
        pageUrl: 'https://github.com/Guilhermee19/ekko-hub/releases',
        size: SIZE,
      }
    },
    updateInstall: async () => {
      for (let done = 0; done <= SIZE; done += SIZE / 25) {
        listeners.forEach((cb) => cb({ done: Math.min(done, SIZE), total: SIZE }))
        await new Promise((r) => setTimeout(r, 80))
      }
      throw new Error('na galeria nada é instalado de verdade')
    },
    onUpdateProgress: async (cb): Promise<Unlisten> => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
