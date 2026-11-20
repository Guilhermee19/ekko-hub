import { create } from 'zustand'

// How Ekko feels, shown by his eyes while he is idle. `rest` follows how long the PC has
// been left alone (from the backend); a `burst` is a short reaction to something.

export type Rest = 'awake' | 'drowsy' | 'asleep'
export type Burst = 'excited' | 'startled'
export type Mood = 'calm' | 'drowsy' | 'asleep' | Burst

interface MoodState {
  rest: Rest
  burst: Burst | null
  /** Bumps on every burst, so the same reaction twice in a row plays again. */
  beat: number
}

export const useMood = create<MoodState>(() => ({ rest: 'awake', burst: null, beat: 0 }))

/** A reaction wins over sleepiness while it lasts. */
export const moodOf = (s: Pick<MoodState, 'rest' | 'burst'>): Mood =>
  s.burst ?? (s.rest === 'awake' ? 'calm' : s.rest)

/** How long each reaction stays on his face. */
export const BURST_MS: Record<Burst, number> = { excited: 2400, startled: 1400 }

let timer: ReturnType<typeof setTimeout> | undefined

/** Ekko reacts for a moment, then goes back to how he was. */
export function feel(burst: Burst) {
  useMood.setState((s) => ({ burst, beat: s.beat + 1 }))
  clearTimeout(timer)
  timer = setTimeout(() => useMood.setState({ burst: null }), BURST_MS[burst])
}

/** Being woken up (someone touched the PC while he slept) gives him a start. */
export function setRest(rest: Rest) {
  const was = useMood.getState().rest
  useMood.setState({ rest })
  if (was === 'asleep' && rest === 'awake') feel('startled')
}
