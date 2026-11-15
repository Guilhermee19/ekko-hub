import type { Clip } from './store'

/** Pinned first, then newest first. */
export function sortClips(clips: Clip[]): Clip[] {
  return [...clips].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at)
}

/** Case-insensitive "contains" over any of the fields; an empty query matches everything. */
export function matches(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLocaleLowerCase('pt-BR')
  return q === '' || fields.some((f) => f.toLocaleLowerCase('pt-BR').includes(q))
}
