import { X } from 'lucide-react'
import { backend } from '@/lib/ipc'
import { IconButton } from '@/ui/primitives'
import { PresenceLine } from '../shared/PresenceLine'
import { useEscape } from '../shared/useOverlay'
import { PanelShell } from './PanelShell'

/** Popover panel used by the tray flyout and the orb. Closes on blur (backend) or Esc. */
export function PanelSurface() {
  useEscape(() => void backend.hideSelf())
  return (
    // Opaque-ish: backdrop blur can't see the desktop through a transparent webview.
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-accent/20 bg-base/97">
      <div className="flex h-11 shrink-0 items-center border-b border-border-soft pr-2">
        <PresenceLine />
        <IconButton label="Fechar" onClick={() => void backend.hideSelf()} className="size-7">
          <X className="size-3.5" />
        </IconButton>
      </div>
      <PanelShell layout="compact" className="min-h-0 flex-1" />
    </div>
  )
}
