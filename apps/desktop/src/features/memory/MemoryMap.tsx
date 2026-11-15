import { useState } from 'react'
import { cn } from '@/lib/cn'
import { groupFacts, useMemory } from './store'
import { neighborsOf, radialLayout, shortLabel, type GraphNode } from './graph'

const W = 480
const H = 340

/** Radial map of memories; hovering a node highlights it and its direct links. */
export function MemoryMap() {
  const facts = useMemory((s) => s.facts)
  const [hovered, setHovered] = useState<string | null>(null)
  const groups = groupFacts(facts)
  const graph = radialLayout(
    groups.map((g) => ({
      id: `cat-${g.category}`,
      label: g.category,
      children: g.facts.map((f) => ({ id: f.id, label: f.text })),
    })),
    { cx: W / 2, cy: H / 2, innerR: 80, outerR: 142 },
  )
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const lit = hovered ? neighborsOf(graph.edges, hovered) : null
  const summary = groups.map((g) => `${g.category}: ${g.facts.length}`).join(', ')

  return (
    <div className="overflow-hidden rounded-xl border border-border-soft bg-surface">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full text-accent"
        role="img"
        aria-label={`Mapa da memória: Ekko no centro ligado a ${groups.length} categorias. ${summary}.`}
      >
        <circle
          cx={W / 2}
          cy={H / 2}
          r={80}
          fill="none"
          strokeDasharray="2 6"
          className="stroke-accent/20"
        />
        <circle
          cx={W / 2}
          cy={H / 2}
          r={142}
          fill="none"
          strokeDasharray="1 8"
          className="stroke-accent/15"
        />
        {graph.edges.map(([a, b]) => {
          const from = byId.get(a)!
          const to = byId.get(b)!
          const on = lit ? lit.has(a) && lit.has(b) && (a === hovered || b === hovered) : false
          return (
            <line
              key={`${a}-${b}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={on ? 1.6 : 1}
              className={cn(
                'transition-opacity duration-200',
                on ? 'hud-glow stroke-accent' : 'stroke-accent/40',
                lit && !on && 'opacity-25',
              )}
            />
          )
        })}
        {graph.nodes.map((n) => (
          <MapNode
            key={n.id}
            node={n}
            dim={!!lit && !lit.has(n.id)}
            active={n.id === hovered}
            onHover={setHovered}
          />
        ))}
      </svg>
    </div>
  )
}

interface MapNodeProps {
  node: GraphNode
  dim: boolean
  active: boolean
  onHover: (id: string | null) => void
}

function MapNode({ node, dim, active, onHover }: MapNodeProps) {
  const r = node.kind === 'root' ? 22 : node.kind === 'category' ? 7 : 4
  const cos = Math.cos(node.angle)
  const radial = node.kind === 'fact'
  // Facts label outward along their ray; root and categories label centered (categories below the dot).
  const anchor = !radial || Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end'
  const off = r + 5
  const lx = radial ? node.x + cos * off : node.x
  const ly = radial
    ? node.y + Math.sin(node.angle) * off + 3
    : node.kind === 'root'
      ? node.y + 4
      : node.y + r + 12
  return (
    <g
      className={cn('cursor-default transition-opacity duration-200', dim && 'opacity-30')}
      onPointerEnter={() => onHover(node.id)}
      onPointerLeave={() => onHover(null)}
    >
      {/* Invisible larger hit area for the small dots. */}
      <circle cx={node.x} cy={node.y} r={Math.max(r, 12)} fill="transparent" />
      <circle
        cx={node.x}
        cy={node.y}
        r={r}
        strokeWidth={node.kind === 'root' ? 1.5 : 1}
        className={cn(
          node.kind === 'root' && 'hud-glow fill-base stroke-accent',
          node.kind === 'category' && 'fill-accent-strong stroke-accent',
          node.kind === 'fact' &&
            (active ? 'fill-accent stroke-accent' : 'fill-surface stroke-accent'),
          active && 'hud-glow',
        )}
      />
      <text
        x={lx}
        y={ly}
        textAnchor={anchor}
        className={cn(
          'pointer-events-none select-none',
          node.kind === 'root' && 'fill-content text-[11px] font-semibold uppercase',
          node.kind === 'category' && 'fill-accent text-[10px] font-semibold uppercase',
          node.kind === 'fact' && (active ? 'fill-content text-[10px]' : 'fill-muted text-[9px]'),
        )}
      >
        {node.kind === 'fact' && !active ? shortLabel(node.label, 18) : node.label}
      </text>
    </g>
  )
}
