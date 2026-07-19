import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../../context/DataContext'
import type { Space, SpaceMode } from '../../types'
import { Avatar } from '../ui/Avatar'
import { HealthDot } from '../ui/HealthDot'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

interface SpacesListProps {
  onSelectSpace: (spaceId: string) => void
}

type FilterTab = 'all' | 'engineering' | 'workstream'

function SpaceRow({ space, onSelect }: { space: Space; onSelect: () => void }) {
  const { usersById, goalsById } = useData()
  const owner = space.ownerId ? usersById[space.ownerId] : undefined
  const health = space.latestStatusPost?.health ?? 'on_track'
  const relatedGoals = space.goalIds.map(id => goalsById[id]).filter(Boolean)

  return (
    <button
      onClick={onSelect}
      className="
        w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] text-left
        hover:bg-[var(--surface)] transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#5B57E0]
      "
    >
      <HealthDot health={health} size={8} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[var(--text)]">{space.name}</span>
          <Badge variant={space.mode === 'engineering' ? 'accent' : 'default'}>
            {space.mode === 'engineering' ? 'engineering' : 'workstream'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {relatedGoals.map(goal => goal && (
            <span key={goal.id} className="text-[11px] text-[var(--text-faint)]">
              ↗ {goal.title}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {owner && <Avatar user={owner} size="sm" />}
        {space.latestStatusPost && (
          <span className="mono text-[11px] text-[var(--text-faint)]">
            updated {space.latestStatusPost.createdAt}
          </span>
        )}
      </div>
    </button>
  )
}

export function SpacesList({ onSelectSpace }: SpacesListProps) {
  const { spaces } = useData()
  const [filter, setFilter] = useState<FilterTab>('all')

  const filteredSpaces = spaces.filter(s => {
    if (filter === 'all') return true
    return s.mode === filter as SpaceMode
  })

  const engineering = filteredSpaces.filter(s => s.mode === 'engineering')
  const workstream = filteredSpaces.filter(s => s.mode === 'workstream')

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'workstream', label: 'Workstreams' },
  ]

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[21px] font-medium text-[var(--text)]">Spaces</h1>
          <Button variant="primary" size="sm">
            <Plus size={14} />
            New space
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-0.5 mb-4 border-b border-[var(--border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`
                px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all duration-150
                focus:outline-none
                ${filter === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Engineering */}
        {engineering.length > 0 && (
          <div className="mb-6">
            {(filter === 'all') && (
              <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-4 py-2">
                Engineering
              </h2>
            )}
            <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
              {engineering.map(space => (
                <SpaceRow
                  key={space.id}
                  space={space}
                  onSelect={() => onSelectSpace(space.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Workstreams */}
        {workstream.length > 0 && (
          <div>
            {(filter === 'all') && (
              <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-4 py-2">
                Workstreams
              </h2>
            )}
            <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
              {workstream.map(space => (
                <SpaceRow
                  key={space.id}
                  space={space}
                  onSelect={() => onSelectSpace(space.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
