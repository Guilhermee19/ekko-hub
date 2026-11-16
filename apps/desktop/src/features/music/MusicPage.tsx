import { Music2 } from 'lucide-react'
import { useSpotify, useSpotifyLive } from '@/features/spotify/store'
import { cn } from '@/lib/cn'
import type { PageProps } from '@/surfaces/panel/pages'
import { EmptyState, PageHeader } from '@/ui/data'
import { ConnectBanner } from './ConnectBanner'
import { Cover } from './Cover'
import { DevicePicker } from './DevicePicker'
import { TransportControls, VolumeControl } from './PlayerControls'
import { ProgressBar } from './ProgressBar'
import { QueueList } from './QueueList'
import { type Track, useMusic } from './store'

export function MusicPage({ compact }: PageProps) {
  useSpotifyLive()
  const track = useMusic((s) => s.track)
  const source = useMusic((s) => s.source)
  const playing = useMusic((s) => s.playing)
  const connected = useSpotify((s) => s.connected)
  const error = useSpotify((s) => s.error)
  const hint = source ? `${playing ? 'Tocando' : 'Pausado'} no ${source}` : 'Nada tocando agora'
  return (
    <div className="animate-rise-in flex flex-col gap-4">
      <PageHeader title="Música" hint={hint} />
      {track ? (
        <Player track={track} compact={compact} />
      ) : (
        <>
          <EmptyState
            icon={Music2}
            title="Nada tocando agora"
            hint="Dê play em qualquer player: Spotify, YouTube no navegador..."
          />
          <VolumeControl />
        </>
      )}
      {connected ? (
        <>
          <DevicePicker />
          {error && <p className="text-[11px] text-danger">Spotify: {error}</p>}
          <QueueList limit={compact ? 3 : undefined} />
        </>
      ) : (
        <ConnectBanner />
      )}
    </div>
  )
}

function Player({ track, compact }: { track: Track; compact: boolean }) {
  const playing = useMusic((s) => s.playing)
  const positionSec = useMusic((s) => s.positionSec)
  const source = useMusic((s) => s.source)
  const canSeek = useMusic((s) => s.canSeek)
  const seek = useMusic((s) => s.seek)
  const details = [track.artist, track.album].filter(Boolean).join(' · ')
  return (
    <section className={cn('flex gap-5', compact ? 'flex-col items-center' : 'items-center')}>
      <Cover gradient={track.cover} playing={playing} className={compact ? 'w-44' : 'w-48'} />
      <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
        <div className={cn('min-w-0', compact && 'text-center')}>
          <div className="label-hud mb-1">
            {playing ? 'Tocando agora' : 'Pausado'}
            {source && ` · ${source}`}
          </div>
          <h2 className="truncate text-[17px] font-semibold">{track.title}</h2>
          {details && <p className="truncate text-[12px] text-muted">{details}</p>}
        </div>
        {track.durationSec > 0 && (
          <ProgressBar
            position={positionSec}
            duration={track.durationSec}
            onSeek={canSeek ? seek : undefined}
          />
        )}
        <TransportControls />
        <VolumeControl />
      </div>
    </section>
  )
}
