import { PageHeader } from '@/ui/data'
import type { PageProps } from '@/surfaces/panel/pages'
import { HeavyApps } from './HeavyApps'
import { ScanPanel } from './ScanPanel'
import { StatusGrid } from './StatusGrid'

/** Meu PC: live status, heavy apps and the guided check (mock data until F2). */
export function MyPcPage({ compact }: Pick<PageProps, 'compact'>) {
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
      <section>
        <h2 className="label-hud mb-2">Programas pesados agora</h2>
        <HeavyApps />
      </section>
    </div>
  )
}
