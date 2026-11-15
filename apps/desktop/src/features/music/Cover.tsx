import { cn } from '@/lib/cn'

/** Gradient "album art" square with a soft accent halo while playing. */
export function Cover({
  gradient,
  playing,
  className,
}: {
  gradient: string
  playing?: boolean
  className?: string
}) {
  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        aria-hidden
        className={cn(
          'absolute -inset-2 rounded-2xl bg-accent/20 blur-xl transition-opacity duration-500',
          playing ? 'opacity-100' : 'opacity-30',
        )}
      />
      <div
        aria-hidden
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-accent/20"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,color-mix(in_srgb,var(--color-content)_18%,transparent),transparent_55%)]" />
      </div>
    </div>
  )
}
