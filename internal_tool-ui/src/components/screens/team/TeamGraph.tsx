import { useState, useMemo } from 'react'
import { useData } from '../../../context/DataContext'
import type { Health } from '../../../types'
import type { PersonSummary, SpaceEdge } from '../../../lib/teamMetrics'

interface TeamGraphProps {
  people: PersonSummary[]
  edges: SpaceEdge[]
  onSelectSpace: (spaceId: string) => void
  onSelectPerson: (userId: string) => void
}

const HEALTH_COLOR: Record<Health, string> = {
  on_track: '#157F4B',
  at_risk:  '#C77700',
  off_track: '#C53434',
}

const WIDTH = 760
const PEOPLE_X = 200
const SPACE_X = WIDTH - 200
const MID_X = (PEOPLE_X + SPACE_X) / 2
const ROW_H = 54
const PAD_Y = 30
const R = 14 // person node radius

type Hover = { kind: 'user' | 'space'; id: string } | null

/** Evenly spaced, vertically-centered y positions for a column of `n` nodes. */
function columnYs(n: number, height: number): number[] {
  const start = height / 2 - ((n - 1) * ROW_H) / 2
  return Array.from({ length: n }, (_, i) => start + i * ROW_H)
}

export function TeamGraph({ people, edges, onSelectSpace, onSelectPerson }: TeamGraphProps) {
  const { usersById, spacesById } = useData()
  const [hover, setHover] = useState<Hover>(null)

  const { personNodes, spaceNodes, height, maxWeight } = useMemo(() => {
    const activeById = new Map(people.map(p => [p.userId, p.activeTotal]))

    const userIds = [...new Set(edges.map(e => e.userId))]
      .sort((a, b) => (activeById.get(b) ?? 0) - (activeById.get(a) ?? 0))

    const spaceWeight = new Map<string, number>()
    for (const e of edges) spaceWeight.set(e.spaceId, (spaceWeight.get(e.spaceId) ?? 0) + e.weight)
    const spaceIds = [...spaceWeight.keys()].sort((a, b) => spaceWeight.get(b)! - spaceWeight.get(a)!)

    const h = Math.max(160, Math.max(userIds.length, spaceIds.length) * ROW_H + PAD_Y)
    const py = columnYs(userIds.length, h)
    const sy = columnYs(spaceIds.length, h)

    return {
      personNodes: userIds.map((id, i) => ({ id, y: py[i], active: activeById.get(id) ?? 0 })),
      spaceNodes: spaceIds.map((id, i) => ({ id, y: sy[i] })),
      height: h,
      maxWeight: Math.max(1, ...edges.map(e => e.weight)),
    }
  }, [people, edges])

  if (edges.length === 0) {
    return <p className="text-[13px] text-[var(--text-faint)] py-4">No assigned active tasks to map.</p>
  }

  const personY = new Map(personNodes.map(n => [n.id, n.y]))
  const spaceY = new Map(spaceNodes.map(n => [n.id, n.y]))

  // Adjacency for dimming: what's connected to the hovered node.
  const connectedUsers = new Set(hover?.kind === 'space' ? edges.filter(e => e.spaceId === hover.id).map(e => e.userId) : [])
  const connectedSpaces = new Set(hover?.kind === 'user' ? edges.filter(e => e.userId === hover.id).map(e => e.spaceId) : [])

  const edgeActive = (e: SpaceEdge) =>
    !hover || (hover.kind === 'user' && e.userId === hover.id) || (hover.kind === 'space' && e.spaceId === hover.id)
  const userActive = (id: string) => !hover || (hover.kind === 'user' && hover.id === id) || connectedUsers.has(id)
  const spaceActive = (id: string) => !hover || (hover.kind === 'space' && hover.id === id) || connectedSpaces.has(id)

  return (
    <div className="border border-[var(--border)] rounded-[10px] p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" style={{ maxWidth: WIDTH, height }} role="img" aria-label="People to spaces assignment graph">
        {/* Column captions */}
        <text x={PEOPLE_X} y={16} textAnchor="middle" className="mono" fill="var(--text-faint)" fontSize={11}>PEOPLE</text>
        <text x={SPACE_X} y={16} textAnchor="middle" className="mono" fill="var(--text-faint)" fontSize={11}>SPACES</text>

        {/* Edges */}
        {edges.map(e => {
          const py = personY.get(e.userId)!
          const sy = spaceY.get(e.spaceId)!
          const active = edgeActive(e)
          return (
            <path
              key={`${e.userId}:${e.spaceId}`}
              d={`M ${PEOPLE_X + R} ${py} C ${MID_X} ${py}, ${MID_X} ${sy}, ${SPACE_X - 8} ${sy}`}
              fill="none"
              stroke={active && hover ? 'var(--accent)' : 'var(--text-faint)'}
              strokeWidth={1 + (e.weight / maxWeight) * 6}
              strokeOpacity={active ? (hover ? 0.9 : 0.35) : 0.08}
              className="transition-all duration-150"
            />
          )
        })}

        {/* Space nodes */}
        {spaceNodes.map(node => {
          const space = spacesById[node.id]
          const health = (space?.latestStatusPost?.health ?? 'on_track') as Health
          const active = spaceActive(node.id)
          return (
            <g
              key={node.id}
              transform={`translate(${SPACE_X}, ${node.y})`}
              className="cursor-pointer transition-opacity duration-150"
              style={{ opacity: active ? 1 : 0.25 }}
              onMouseEnter={() => setHover({ kind: 'space', id: node.id })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectSpace(node.id)}
            >
              <rect x={-6} y={-6} width={12} height={12} rx={3} fill="var(--surface)" stroke="var(--border)" />
              <circle cx={0} cy={0} r={3} fill={HEALTH_COLOR[health]} />
              <text x={14} y={4} textAnchor="start" fill="var(--text)" fontSize={13}>
                {space?.name ?? 'Unknown space'}
              </text>
            </g>
          )
        })}

        {/* Person nodes */}
        {personNodes.map(node => {
          const user = usersById[node.id]
          const active = userActive(node.id)
          return (
            <g
              key={node.id}
              transform={`translate(${PEOPLE_X}, ${node.y})`}
              className="cursor-pointer transition-opacity duration-150"
              style={{ opacity: active ? 1 : 0.25 }}
              onMouseEnter={() => setHover({ kind: 'user', id: node.id })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectPerson(node.id)}
            >
              <circle cx={0} cy={0} r={R} fill={user?.color ?? '#71717A'} />
              <text x={0} y={4} textAnchor="middle" fill="#fff" fontSize={10} className="font-medium select-none">
                {user?.initials ?? '?'}
              </text>
              <text x={-R - 8} y={0} textAnchor="end" fill="var(--text)" fontSize={13}>{user?.name ?? 'Unknown'}</text>
              <text x={-R - 8} y={14} textAnchor="end" className="mono" fill="var(--text-faint)" fontSize={10}>
                {node.active} active
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
