import { useEffect } from 'react'
import { PageHeader } from '@/ui/data'
import type { PageProps } from '@/surfaces/panel/pages'
import { ProcessTable } from './ProcessTable'
import { ScanPanel } from './ScanPanel'
import { StatusGrid } from './StatusGrid'
import { connectSystem } from './store'

/** Meu PC: live telemetry, the guided check and the running apps. */
export function MyPcPage({ compact }: Pick<PageProps, 'compact'>) {
  // Follow the backend's telemetry only while the page is open.
  useEffect(() => connectSystem(), [])
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <PageHeader
        title="Meu PC"
        hint="Desempenho ao vivo"
        actions={
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="animate-hud-breathe size-1.5 rounded-full bg-accent" aria-hidden /> Ao
            vivo
          </span>
        }
      />
      <StatusGrid compact={compact} />
      <ScanPanel compact={compact} />
      <ProcessTable />
    </div>
  )
}
