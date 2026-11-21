import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { SeasonSky } from '@/features/season/SeasonSky'
import { useSeason } from '@/features/season/useSeason'
import { usePresence } from '@/stores/liveActivity'
import { isQuiet } from '../notch/layout'
import { PresenceLine } from './PresenceLine'

/**
 * The notch's bar for the other display modes: black with the bottom light, Ekko's
 * eyes (gliding to the side when something is going on), holiday scene behind.
 * Extra controls (close, pin) go in `children`, on the right.
 */
export function EkkoBar({
  center = false,
  compact = false,
  className,
  children,
}: {
  center?: boolean
  compact?: boolean
  className?: string
  children?: ReactNode
}) {
  const season = useSeason()
  const presence = usePresence()
  return (
    <div
      data-season={season ?? undefined}
      className={cn(
        'ekko-glow relative flex h-11 shrink-0 items-center overflow-hidden',
        className,
      )}
    >
      {season && <SeasonSky season={season} props={center || isQuiet(presence)} />}
      <PresenceLine eyes center={center} compact={compact} />
      {children}
    </div>
  )
}
