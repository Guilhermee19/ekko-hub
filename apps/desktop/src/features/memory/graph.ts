// Pure radial layout for the memory map: Ekko in the center, categories on an inner ring,
// facts fanned out on an outer ring inside their category's angular sector.

export interface GraphInput {
  id: string
  label: string
  children: { id: string; label: string }[]
}

export type NodeKind = 'root' | 'category' | 'fact'

export interface GraphNode {
  id: string
  label: string
  kind: NodeKind
  x: number
  y: number
  /** Angle in radians (0 = right, clockwise in SVG coords); 0 for the root. */
  angle: number
}

export interface Graph {
  nodes: GraphNode[]
  edges: [string, string][]
}

export const ROOT_ID = 'ekko'

interface LayoutOptions {
  cx: number
  cy: number
  innerR: number
  outerR: number
}

export function radialLayout(
  groups: GraphInput[],
  { cx, cy, innerR, outerR }: LayoutOptions,
): Graph {
  const nodes: GraphNode[] = [{ id: ROOT_ID, label: 'Ekko', kind: 'root', x: cx, y: cy, angle: 0 }]
  const edges: [string, string][] = []
  const total = groups.length
  if (total === 0) return { nodes, edges }
  const sector = (2 * Math.PI) / total
  // Start at the top so the first category sits above Ekko.
  const start = -Math.PI / 2

  groups.forEach((group, gi) => {
    const angle = start + gi * sector
    nodes.push({
      ...polar(cx, cy, innerR, angle),
      id: group.id,
      label: group.label,
      kind: 'category',
      angle,
    })
    edges.push([ROOT_ID, group.id])
    // Facts spread over 70% of the sector, centered on the category.
    const span = sector * 0.7
    const n = group.children.length
    group.children.forEach((child, ci) => {
      const a = n === 1 ? angle : angle - span / 2 + (span * ci) / (n - 1)
      nodes.push({
        ...polar(cx, cy, outerR, a),
        id: child.id,
        label: child.label,
        kind: 'fact',
        angle: a,
      })
      edges.push([group.id, child.id])
    })
  })
  return { nodes, edges }
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** Ids directly connected to `id` (plus `id` itself). */
export function neighborsOf(edges: [string, string][], id: string): Set<string> {
  const out = new Set([id])
  for (const [a, b] of edges) {
    if (a === id) out.add(b)
    if (b === id) out.add(a)
  }
  return out
}

/** Shortens long labels for the map. */
export function shortLabel(text: string, max = 18): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}
