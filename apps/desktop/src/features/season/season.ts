// Holiday looks for Ekko: which one (if any) a given day gets. Pure, local time.

export type Season = 'christmas' | 'newYear' | 'carnival' | 'easter' | 'valentines' | 'halloween'

export const SEASONS: { id: Season; name: string; when: string; look: string }[] = [
  {
    id: 'christmas',
    name: 'Natal',
    when: '1 a 26/12',
    look: 'Pisca-pisca, neve e presentes',
  },
  {
    id: 'newYear',
    name: 'Ano Novo',
    when: '27/12 a 2/1',
    look: 'Fogos de artifício e brilho dourado',
  },
  {
    id: 'carnival',
    name: 'Carnaval',
    when: 'Sábado à Quarta de Cinzas',
    look: 'Máscara e confete',
  },
  { id: 'easter', name: 'Páscoa', when: 'Semana Santa', look: 'Coelho pulando e ovos nos cantos' },
  {
    id: 'valentines',
    name: 'Dia dos Namorados',
    when: '10 a 12/6',
    look: 'Corações e brilho roxo',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    when: '25 a 31/10',
    look: 'Abóbora, morcegos e brilho laranja',
  },
]

const DAY = 86_400_000

/** Easter Sunday (Gregorian, "anonymous" algorithm), local midnight. */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

/** Whole days from Easter Sunday to `d` (negative before it). */
function daysFromEaster(d: Date): number {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((day.getTime() - easterSunday(d.getFullYear()).getTime()) / DAY)
}

/** The holiday look for this day, or null on an ordinary day. */
export function seasonOf(d: Date): Season | null {
  const month = d.getMonth() + 1
  const day = d.getDate()
  if ((month === 12 && day >= 27) || (month === 1 && day <= 2)) return 'newYear'
  if (month === 12 && day <= 26) return 'christmas'
  if (month === 10 && day >= 25) return 'halloween'
  if (month === 6 && day >= 10 && day <= 12) return 'valentines'
  const fromEaster = daysFromEaster(d)
  // Carnival: Saturday (Easter − 50) to Ash Wednesday (Easter − 46).
  if (fromEaster >= -50 && fromEaster <= -46) return 'carnival'
  // Palm Sunday to Easter Monday.
  if (fromEaster >= -7 && fromEaster <= 1) return 'easter'
  return null
}
