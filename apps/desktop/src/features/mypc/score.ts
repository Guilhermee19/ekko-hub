import type { ScanStep } from './store'

/** How the finished check reads: drives the ring color and the headline. */
export type Grade = 'good' | 'fair' | 'bad'

const POINTS = { ok: 100, info: 85, warn: 45 } as const

/** 0..100 health score from the finished steps; null while nothing finished. */
export function scanScore(steps: readonly ScanStep[]): number | null {
  const done = steps.flatMap((s) =>
    s.status in POINTS ? [POINTS[s.status as keyof typeof POINTS]] : [],
  )
  if (done.length === 0) return null
  return Math.round(done.reduce((a, b) => a + b, 0) / done.length)
}

export function scanGrade(score: number): Grade {
  if (score >= 85) return 'good'
  if (score >= 60) return 'fair'
  return 'bad'
}

export const GRADE_LABEL: Record<Grade, string> = {
  good: 'Saudável',
  fair: 'Pode melhorar',
  bad: 'Precisa de atenção',
}

/** Bytes the pending suggestions would free (temporários + lixeira). */
export function freeableBytes(steps: readonly ScanStep[], applied: readonly string[]): number {
  return steps.reduce((sum, s) => {
    const a = s.check?.action
    if (!a || applied.includes(s.id) || a.kind === 'openStartup') return sum
    return sum + a.bytes
  }, 0)
}

/** "4 ok · 1 atenção · 1 aviso" counts for the summary chips. */
export function statusCounts(steps: readonly ScanStep[]) {
  const count = (status: string) => steps.filter((s) => s.status === status).length
  return { ok: count('ok'), warn: count('warn'), info: count('info') }
}
