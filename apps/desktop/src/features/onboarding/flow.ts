/** What "Continuar" does at step `index` of `total`: stay, go to the next step, or finish. */
export type Advance = { kind: 'stay' } | { kind: 'next'; index: number } | { kind: 'finish' }

export function advance(index: number, total: number, blocked: boolean): Advance {
  if (blocked) return { kind: 'stay' }
  if (index >= total - 1) return { kind: 'finish' }
  return { kind: 'next', index: index + 1 }
}

/** The name step needs the user's name; everything else can always continue. */
export function isBlocked(stepId: string, userName: string): boolean {
  return stepId === 'names' && !userName.trim()
}
