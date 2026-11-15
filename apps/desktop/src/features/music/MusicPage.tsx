import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { PageHeader } from '@/ui/data'
import { Toggle } from '@/ui/forms'
import { ConnectBanner } from './ConnectBanner'
import { Cover } from './Cover'
import { DevicePicker } from './DevicePicker'
import { TransportControls, VolumeControl } from './PlayerControls'
import { ProgressBar } from './ProgressBar'
import { QueueList } from './QueueList'
import { useMusic } from './store'

export function MusicPage({ compact }: PageProps) {
  const connected = useMusic((s) => s.connected)
  const setConnected = useMusic((s) => s.setConnected)
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <PageHeader
        title="Música"
        hint={connected ? 'Spotify conectado' : 'Spotify não conectado'}
        actions={
          <label className="flex items-center gap-2 text-[11px] text-muted">
            <span className={cn(compact && 'sr-only')}>Protótipo: conectado</span>
            <Toggle checked={connected} label="Simular Spotify conectado" onChange={setConnected} />
          </label>
        }
      />
      {connected ? <Player compact={compact} /> : <ConnectBanner />}
    </div>
  )
}

function Player({ compact }: { compact: boolean }) {
  const { track, playing, positionSec, seek } = useMusic()
  return (
    <>
      <section className={cn('flex gap-5', compact ? 'flex-col items-center' : 'items-center')}>
        <Cover gradient={track.cover} playing={playing} className={compact ? 'w-44' : 'w-48'} />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          <div className={cn('min-w-0', compact && 'text-center')}>
            <div className="label-hud mb-1">{playing ? 'Tocando agora' : 'Pausado'}</div>
            <h2 className="truncate text-[17px] font-semibold">{track.title}</h2>
            <p className="truncate text-[12px] text-muted">
              {track.artist} · {track.album}
            </p>
          </div>
          <ProgressBar position={positionSec} duration={track.durationSec} onSeek={seek} />
          <TransportControls />
          <VolumeControl />
        </div>
      </section>
      <DevicePicker />
      <QueueList limit={compact ? 3 : undefined} />
    </>
  )
}
