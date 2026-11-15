const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** pt-BR relative time: "agora", "há 2 min", "há 3 h", "ontem", "há 4 dias", "12/11". */
export function relativeTime(at: number, now: number): string {
  const diff = Math.max(0, now - at)
  if (diff < MIN) return 'agora'
  if (diff < HOUR) return `há ${Math.floor(diff / MIN)} min`
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`
  const days = Math.floor(diff / DAY)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  const d = new Date(at)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
