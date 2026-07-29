import { useState, useEffect, useMemo } from 'react'
import { List, Share2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import * as api from '../../api'
import type { Task } from '../../types'
import { buildTeamSummary, type PersonSummary } from '../../lib/teamMetrics'
import { TeamRoster } from './team/TeamRoster'
import { TeamGraph } from './team/TeamGraph'

interface TeamProps {
  onSelectTask: (taskId: string) => void
  onSelectSpace: (spaceId: string) => void
}

type Lens = 'list' | 'graph'
type Sort = 'workload' | 'name' | 'completed'

export function Team({ onSelectTask, onSelectSpace }: TeamProps) {
  const { users, usersById } = useData()
  const [rawTasks, setRawTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [lens, setLens] = useState<Lens>('list')
  const [sort, setSort] = useState<Sort>('workload')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Fetch on mount rather than through the global initial load, so the Team
  // view doesn't slow down app startup. `GET /tasks` applies §6 privacy.
  useEffect(() => {
    let live = true
    api.getTasks()
      .then(raw => { if (live) setRawTasks(raw.map(api.mapTask)) })
      .catch(console.error)
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  const summary = useMemo(() => buildTeamSummary(rawTasks, users), [rawTasks, users])

  const sortedPeople = useMemo(() => {
    const nameOf = (p: PersonSummary) =>
      p.userId ? (usersById[p.userId]?.name ?? '') : '￿' // Unassigned sorts last by name
    const people = [...summary.people]
    switch (sort) {
      case 'name':
        people.sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
        break
      case 'completed':
        people.sort((a, b) => b.completed - a.completed || b.activeTotal - a.activeTotal)
        break
      default: // workload
        people.sort((a, b) => b.activeTotal - a.activeTotal || b.completed - a.completed)
    }
    return people
  }, [summary.people, sort, usersById])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 pt-8 pb-12 max-w-[1100px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-[21px] font-medium text-[var(--text)]">Team</h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">
              Responsibility distribution across shared work — active tasks and completed count per person.
            </p>
          </div>

          {/* List / Graph toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-[8px] border border-[var(--border)] flex-shrink-0">
            {([['list', List, 'List'], ['graph', Share2, 'Graph']] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setLens(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0] ${
                  lens === id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-[13px] text-[var(--text-faint)] py-4">Loading…</p>
        ) : summary.people.length === 0 ? (
          <p className="text-[13px] text-[var(--text-faint)] py-4">No shared tasks yet.</p>
        ) : lens === 'list' ? (
          <TeamRoster
            people={sortedPeople}
            maxActive={summary.maxActive}
            tasks={rawTasks}
            sort={sort}
            onSortChange={setSort}
            expanded={expanded}
            onToggleExpand={id => setExpanded(prev => (prev === id ? null : id))}
            onSelectTask={onSelectTask}
          />
        ) : (
          <TeamGraph
            people={summary.people}
            edges={summary.edges}
            onSelectSpace={onSelectSpace}
            onSelectPerson={userId => { setLens('list'); setExpanded(userId) }}
          />
        )}
      </div>
    </div>
  )
}
