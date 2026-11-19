import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  CAPTURE_SAVED,
  CAPTURE_START,
  type CaptureBackend,
  type CaptureFrame,
  type CaptureSaved,
} from './captureTypes'

interface Frozen {
  path: string
  width: number
  height: number
}

const frame = (f: Frozen): CaptureFrame => ({
  url: convertFileSrc(f.path),
  width: f.width,
  height: f.height,
})

export const tauriCapture: CaptureBackend = {
  captureStart: () => invoke('capture_start'),
  captureFrame: async () => {
    const f = await invoke<Frozen | null>('capture_frame')
    return f && frame(f)
  },
  onCaptureStart: (cb) => listen<Frozen>(CAPTURE_START, (e) => cb(frame(e.payload))),
  captureCommit: (region) => invoke('capture_commit', { region }),
  captureCancel: () => invoke('capture_cancel'),
  onCaptureSaved: (cb) => listen<CaptureSaved>(CAPTURE_SAVED, (e) => cb(e.payload)),
  shelfCopyImage: (id) => invoke('shelf_copy_image', { id }),
}
