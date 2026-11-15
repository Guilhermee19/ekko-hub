import { describe, expect, it } from 'vitest'
import { normalize, rankCommands, scoreCommand, scoreToken, type Rankable } from './commands'

const items: Rankable[] = [
  { id: 'timer', group: 'actions', label: 'Iniciar timer de 5 min' },
  { id: 'music', group: 'actions', label: 'Pausar/tocar música', keywords: ['spotify'] },
  { id: 'water', group: 'actions', label: 'Beber água +1', keywords: ['copo'] },
  { id: 'go-music', group: 'navigate', label: 'Música' },
  { id: 'settings', group: 'settings', label: 'Abrir configurações' },
]

const ids = (q: string) => rankCommands(items, q).flatMap((g) => g.items.map((i) => i.id))

describe('palette ranking', () => {
  it('normalizes accents and case', () => {
    expect(normalize('  Configurações ÁGUA ')).toBe('configuracoes agua')
  })

  it('prefers prefix over word prefix over substring over fuzzy', () => {
    const prefix = scoreToken('mus', 'musica')
    const word = scoreToken('mus', 'tocar musica')
    const sub = scoreToken('sic', 'musica')
    const fuzzy = scoreToken('msc', 'musica')
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(sub)
    expect(sub).toBeGreaterThan(fuzzy)
    expect(fuzzy).toBeGreaterThan(0)
    expect(scoreToken('xyz', 'musica')).toBe(-1)
  })

  it('matches ignoring accents and requires every token', () => {
    expect(ids('agua')).toEqual(['water'])
    expect(ids('MUSICA')).toEqual(['music', 'go-music'])
    expect(scoreCommand('timer xyz', items[0])).toBe(-1)
    expect(ids('timer 5')).toEqual(['timer'])
  })

  it('uses keywords', () => {
    expect(ids('spot')).toEqual(['music'])
    expect(ids('copo')).toEqual(['water'])
  })

  it('keeps group order and returns everything for an empty query', () => {
    const groups = rankCommands(items, '')
    expect(groups.map((g) => g.group)).toEqual(['actions', 'navigate', 'settings'])
    expect(groups.flatMap((g) => g.items)).toHaveLength(items.length)
    expect(rankCommands(items, 'zzzz')).toEqual([])
  })

  it('sorts by score inside a group', () => {
    const list: Rankable[] = [
      { id: 'a', group: 'actions', label: 'Tocar música' },
      { id: 'b', group: 'actions', label: 'Música aleatória' },
    ]
    expect(rankCommands(list, 'mus')[0].items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})
