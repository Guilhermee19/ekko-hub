import { describe, expect, it } from 'vitest'
import { neighborsOf, radialLayout, ROOT_ID, shortLabel } from './graph'
import { filterNotes, groupFacts, type Fact, type Note } from './store'

const opts = { cx: 100, cy: 100, innerR: 40, outerR: 80 }

const groups = [
  {
    id: 'a',
    label: 'A',
    children: [
      { id: 'a1', label: 'a1' },
      { id: 'a2', label: 'a2' },
    ],
  },
  { id: 'b', label: 'B', children: [{ id: 'b1', label: 'b1' }] },
  { id: 'c', label: 'C', children: [] },
]

describe('radialLayout', () => {
  it('places root at center and rings at their radii', () => {
    const { nodes, edges } = radialLayout(groups, opts)
    expect(nodes).toHaveLength(1 + 3 + 3)
    expect(edges).toHaveLength(3 + 3)
    for (const n of nodes) {
      const r = Math.hypot(n.x - 100, n.y - 100)
      const want = n.kind === 'root' ? 0 : n.kind === 'category' ? 40 : 80
      expect(r).toBeCloseTo(want, 6)
    }
  })

  it('first category sits on top and single facts align with their category', () => {
    const { nodes } = radialLayout(groups, opts)
    const a = nodes.find((n) => n.id === 'a')!
    expect(a.x).toBeCloseTo(100)
    expect(a.y).toBeCloseTo(60)
    const b = nodes.find((n) => n.id === 'b')!
    expect(nodes.find((n) => n.id === 'b1')!.angle).toBeCloseTo(b.angle)
  })

  it('handles an empty graph', () => {
    expect(radialLayout([], opts).nodes.map((n) => n.id)).toEqual([ROOT_ID])
  })

  it('neighborsOf returns direct links only', () => {
    const { edges } = radialLayout(groups, opts)
    expect([...neighborsOf(edges, 'a')].sort()).toEqual(['a', 'a1', 'a2', ROOT_ID].sort())
    expect([...neighborsOf(edges, 'a1')].sort()).toEqual(['a', 'a1'])
  })

  it('shortLabel truncates with ellipsis', () => {
    expect(shortLabel('curto')).toBe('curto')
    expect(shortLabel('um texto bem comprido demais', 10)).toBe('um texto…')
  })
})

describe('memory helpers', () => {
  it('groupFacts keeps category order and drops empty groups', () => {
    const facts: Fact[] = [
      { id: '1', category: 'Trabalho', text: 'x', source: '' },
      { id: '2', category: 'Pessoal', text: 'y', source: '' },
    ]
    expect(groupFacts(facts).map((g) => g.category)).toEqual(['Pessoal', 'Trabalho'])
  })

  it('filterNotes ignores case and accents and matches tags', () => {
    const notes: Note[] = [
      { id: '1', title: 'Reunião', excerpt: '', tags: ['trabalho'], date: '2026-01-01' },
      { id: '2', title: 'Mercado', excerpt: 'café', tags: ['casa'], date: '2026-01-01' },
    ]
    expect(filterNotes(notes, 'REUNIAO').map((n) => n.id)).toEqual(['1'])
    expect(filterNotes(notes, 'cafe').map((n) => n.id)).toEqual(['2'])
    expect(filterNotes(notes, 'casa').map((n) => n.id)).toEqual(['2'])
    expect(filterNotes(notes, '  ')).toHaveLength(2)
  })
})
