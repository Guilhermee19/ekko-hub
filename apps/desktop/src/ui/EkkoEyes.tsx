import { cn } from '@/lib/cn'
import type { Phase } from '@/stores/assistant'
import { moodOf, useMood, type Mood } from '@/stores/mood'

interface EkkoEyesProps {
  phase: Phase
  className?: string
  /** Fixed mood for previews; by default the eyes follow how Ekko feels. */
  mood?: Mood
}

/** What the eyes are doing: the assistant phase wins, the mood shows while idle. */
type Look = Exclude<Phase, 'idle'> | Mood

/** Eye size and vertical center per look, in viewBox units (36×16). */
const SHAPE: Record<Look, { w: number; h: number; cy: number }> = {
  calm: { w: 5, h: 12, cy: 8 },
  speaking: { w: 5, h: 12, cy: 8 },
  listening: { w: 5.6, h: 13.6, cy: 8 },
  thinking: { w: 5, h: 4, cy: 8 },
  // Heavy lids: shorter and sitting lower.
  drowsy: { w: 5, h: 7.5, cy: 9.5 },
  asleep: { w: 6.4, h: 1.8, cy: 11 },
  excited: { w: 5.4, h: 13, cy: 8 },
  startled: { w: 6.6, h: 14.6, cy: 8 },
}

const CENTERS = [9, 27]

/**
 * Ekko peeking out of the notch: two glowing capsules, no ring. Alive while idle: he
 * blinks, glances around, gets sleepy when the PC is left alone, hops when something
 * good happens and jumps at a scare. Size it with `className` (36×16 ratio).
 */
export function EkkoEyes({ phase, className, mood }: EkkoEyesProps) {
  const felt = useMood(moodOf)
  const beat = useMood((s) => s.beat)
  const look: Look = phase === 'idle' ? (mood ?? felt) : phase
  const { w, h, cy } = SHAPE[look]
  return (
    <svg
      viewBox="0 0 36 16"
      aria-hidden="true"
      data-look={look}
      className={cn('ekko-eyes text-content', className)}
    >
      {/* Remounted per reaction, so the same one twice in a row plays again. */}
      <g key={beat} className="ekko-eyes-body" fill="currentColor">
        {CENTERS.map((cx) =>
          look === 'excited' ? (
            // Smiling eyes: ^ ^
            <path
              key={cx}
              className="ekko-eye"
              d={`M${cx - 3.4} 10.5 Q${cx} 2.5 ${cx + 3.4} 10.5`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          ) : (
            <rect
              key={cx}
              className="ekko-eye"
              x={cx - w / 2}
              y={cy - h / 2}
              width={w}
              height={h}
              rx={Math.min(w, h) / 2}
            />
          ),
        )}
        {look === 'asleep' && (
          <text className="ekko-zz" x="31" y="5" fontSize="8" fontWeight="700">
            z
          </text>
        )}
      </g>
    </svg>
  )
}
