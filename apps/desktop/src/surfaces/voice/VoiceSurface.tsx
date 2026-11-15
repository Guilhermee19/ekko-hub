import { useEffect } from 'react'
import { backend } from '@/lib/ipc'
import { useAssistant } from '@/stores/assistant'
import { demo } from '@/stores/demo'
import { useSettings } from '@/stores/settings'
import { EkkoCore } from '@/ui/EkkoCore'
import { PresenceLine } from '../shared/PresenceLine'
import { useEscape, useSummon } from '../shared/useOverlay'

const HIDE_AFTER_IDLE_MS = 4000

/** Voice-only mode: transient overlay near the bottom, gone shortly after going idle. */
export function VoiceSurface() {
  const name = useSettings((s) => s.settings.assistantName)
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
      <div className="animate-rise-in flex h-16 w-full items-center gap-1 rounded-full border border-accent/25 bg-base/95 pl-2 shadow-2xl">
        <EkkoCore label={name} active={phase !== 'idle'} className="size-12 shrink-0" />
        <PresenceLine compact />
      </div>
    </div>
  )
}
