import { X } from 'lucide-react'
import { useRef } from 'react'
import { backend } from '@/lib/ipc'
import { IconButton } from '@/ui/primitives'
import { EkkoBar } from '../shared/EkkoBar'
import { playExit, useEntrance } from '../shared/useEntrance'
import { useEscape } from '../shared/useOverlay'
import { PanelShell } from './PanelShell'

/** Popover panel used by the tray flyout and the orb, in the notch's black. Closes on
 *  blur (backend) or Esc. */
export function PanelSurface() {
  const root = useRef<HTMLDivElement>(null)
  useEntrance(root)
  const close = () => playExit(root.current, () => void backend.hideSelf())
  useEscape(close)
  return (
    <div ref={root} className="ekko-shell flex h-full flex-col overflow-hidden">
      <EkkoBar className="border-b border-border-soft pr-2">
        <IconButton label="Fechar" onClick={close} className="size-7">
          <X className="size-3.5" />
        </IconButton>
      </EkkoBar>
      <PanelShell layout="compact" className="min-h-0 flex-1" />
    </div>
  )
}
