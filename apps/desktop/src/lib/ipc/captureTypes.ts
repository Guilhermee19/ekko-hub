import type { Unlisten } from './types'

// Mirrors services/capture.rs + commands/capture.rs.

export const CAPTURE_START = 'ekko://capture/start'
export const CAPTURE_SAVED = 'ekko://capture/saved'

/** The frozen screen the overlay shows, in physical pixels. */
export interface CaptureFrame {
  /** URL the webview can load (asset protocol / data URL in the browser). */
  url: string
  width: number
  height: number
}

/** Area picked in the overlay, in frame pixels. */
export interface CaptureRegion {
  x: number
  y: number
  w: number
  h: number
}

export interface CaptureSaved {
  /** Shelf item id; null when the shelf was full (the file is still saved). */
  id: string | null
  path: string
  name: string
  width: number
  height: number
}

export interface CaptureBackend {
  /** Freezes the screen under the cursor and opens the selection overlay. */
  captureStart(): Promise<void>
  captureFrame(): Promise<CaptureFrame | null>
  onCaptureStart(cb: (f: CaptureFrame) => void): Promise<Unlisten>
  captureCommit(region: CaptureRegion): Promise<CaptureSaved>
  captureCancel(): Promise<void>
  onCaptureSaved(cb: (s: CaptureSaved) => void): Promise<Unlisten>
  /** Copies a shelved image (a print) to the clipboard as a picture. */
  shelfCopyImage(id: string): Promise<void>
}
