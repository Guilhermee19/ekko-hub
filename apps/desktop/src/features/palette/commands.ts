// Pure matching/ranking for the command palette (no React, no stores).

export type CommandGroup = 'actions' | 'navigate' | 'settings'

export const GROUP_ORDER: CommandGroup[] = ['actions', 'navigate', 'settings']

export const GROUP_LABEL: Record<CommandGroup, string> = {
  actions: 'Ações',
  navigate: 'Ir para',
  settings: 'Configurações',
}

export interface Rankable {
  id: string
  group: CommandGroup
  label: string
  /** Extra words that should also match ("agua", "copo"). */
  keywords?: string[]
}

/** Lowercase and strip accents, so "musica" finds "Música". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/**
 * Score of one query token against one text (higher = better, -1 = no match):
 * prefix of the text > prefix of a word > substring > letters in order (fuzzy).
 */
export function scoreToken(token: string, text: string): number {
  if (!token) return 0
  if (text.startsWith(token)) return 100 - Math.min(text.length - token.length, 40) / 4
  if (text.split(/[^\p{L}\p{N}]+/u).some((w) => w.startsWith(token))) return 70
  if (text.includes(token)) return 50
  // Subsequence: every letter appears in order; tighter spans score higher.
  let from = 0
  let first = -1
  for (const ch of token) {
    const at = text.indexOf(ch, from)
    if (at < 0) return -1
    if (first < 0) first = at
    from = at + 1
  }
  const span = from - first
  // Letters scattered across the whole label are noise, not intent.
  if (span > token.length * 2 + 2) return -1
  return Math.max(1, 30 - (span - token.length) * 2)
}

/** Every query token must match the label or a keyword; the best field counts. */
export function scoreCommand(query: string, item: Rankable): number {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  const label = normalize(item.label)
  const keywords = (item.keywords ?? []).map(normalize)
  let total = 0
  for (const t of tokens) {
    const best = Math.max(scoreToken(t, label), ...keywords.map((k) => scoreToken(t, k) - 5))
    if (best < 0) return -1
    total += best
  }
  return total
}

export interface RankedGroup<T extends Rankable> {
  group: CommandGroup
  items: T[]
}

/**
 * Filters and sorts by score inside each group, keeping the group order fixed so the
 * palette layout stays predictable. An empty query returns everything as declared.
 */
export function rankCommands<T extends Rankable>(items: T[], query: string): RankedGroup<T>[] {
  const scored = items
    .map((item, index) => ({ item, index, score: scoreCommand(query, item) }))
    .filter((x) => x.score >= 0)
  return GROUP_ORDER.map((group) => ({
    group,
    items: scored
      .filter((x) => x.item.group === group)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((x) => x.item),
  })).filter((g) => g.items.length > 0)
}
