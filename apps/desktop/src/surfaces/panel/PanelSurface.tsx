import { X } from 'lucide-react'
import { backend } from '@/lib/ipc'
import { IconButton } from '@/ui/primitives'
import { EkkoBar } from '../shared/EkkoBar'
import { useEscape } from '../shared/useOverlay'
import { PanelShell } from './PanelShell'

/** Popover panel used by the tray flyout and the orb, in the notch's black. Closes on
 *  blur (backend) or Esc. */
export function PanelSurface() {
  useEscape(() => void backend.hideSelf())
  return (
    <div className="ekko-shell flex h-full flex-col overflow-hidden">
      <EkkoBar className="border-b border-border-soft pr-2">
        <IconButton label="Fechar" onClick={() => void backend.hideSelf()} className="size-7">
          <X className="size-3.5" />
        </IconButton>
      </EkkoBar>
      <PanelShell layout="compact" className="min-h-0 flex-1" />
    </div>
  )
}
