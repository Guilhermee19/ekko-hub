import { useEffect } from 'react'
import { backend } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'
import { demo } from '@/stores/demo'
import { EkkoBar } from '../shared/EkkoBar'
import { useEscape, useSummon } from '../shared/useOverlay'

const HIDE_AFTER_IDLE_MS = 4000

/** Voice-only mode: a notch-style capsule near the bottom, gone shortly after going idle. */
export function VoiceSurface() {
  const phase = useAssistant((s) => s.phase)
  const toast = useAssistant((s) => s.toast)

  useSummon(demo.listening)
  useEscape(() => void backend.hideSelf())

  useEffect(() => {
    if (phase !== 'idle' || toast) return
    const id = window.setTimeout(() => void backend.hideSelf(), HIDE_AFTER_IDLE_MS)
    return () => window.clearTimeout(id)
  }, [phase, toast])

  return (
    <div className="no-select grid h-full w-full place-items-center p-3">
      <EkkoBar
        compact
        className="animate-rise-in h-14 w-full rounded-full shadow-[0_12px_40px_-10px_rgb(0_0_0/0.9)]"
      />
    </div>
  )
}
