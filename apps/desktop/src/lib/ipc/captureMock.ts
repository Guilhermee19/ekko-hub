import {
  CAPTURE_SAVED,
  CAPTURE_START,
  type CaptureBackend,
  type CaptureFrame,
  type CaptureSaved,
} from './captureTypes'
import type { Unlisten } from './types'

// Browser gallery: a drawn "desktop" stands in for the screen, and the print lands as
// a fake shelf item so the notch card can be tried without Tauri.

interface Bus {
  on: (event: string, cb: (payload: unknown) => void) => Promise<Unlisten>
  fire: (event: string, payload: unknown) => void
  shelve: (name: string) => Promise<string | null>
}

const W = 1920
const H = 1080

function fakeScreen(): CaptureFrame {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#1b2a4a"/><stop offset="1" stop-color="#5a3a6e"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect x="240" y="160" width="900" height="600" rx="12" fill="#f4f4f5"/><rect x="240" y="160" width="900" height="44" rx="12" fill="#d4d4d8"/><rect x="290" y="250" width="520" height="28" rx="6" fill="#a1a1aa"/><rect x="290" y="300" width="760" height="18" rx="5" fill="#d4d4d8"/><rect x="290" y="336" width="700" height="18" rx="5" fill="#d4d4d8"/><rect x="1220" y="300" width="460" height="420" rx="12" fill="#0f172a"/><circle cx="1450" cy="470" r="90" fill="#38bdf8"/></svg>`
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, width: W, height: H }
}

export function mockCapture({ on, fire, shelve }: Bus): CaptureBackend {
  let frozen: CaptureFrame | null = null
  const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ').replaceAll(':', '-')
  return {
    captureStart: () => {
      frozen = fakeScreen()
      fire(CAPTURE_START, frozen)
      return Promise.resolve()
    },
    captureFrame: () => Promise.resolve(frozen ?? fakeScreen()),
    onCaptureStart: (cb) => on(CAPTURE_START, (f) => cb(f as CaptureFrame)),
    captureCommit: async (r) => {
      frozen = null
      const name = `Print ${stamp()}.png`
      const saved: CaptureSaved = {
        id: await shelve(name),
        path: `C:\\Users\\voce\\Pictures\\Ekko\\${name}`,
        name,
        width: Math.round(r.w),
        height: Math.round(r.h),
      }
      fire(CAPTURE_SAVED, saved)
      return saved
    },
    captureCancel: () => {
      frozen = null
      return Promise.resolve()
    },
    onCaptureSaved: (cb) => on(CAPTURE_SAVED, (s) => cb(s as CaptureSaved)),
    shelfCopyImage: () => Promise.resolve(),
  }
}
