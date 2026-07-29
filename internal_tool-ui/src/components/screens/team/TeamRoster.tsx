import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { useData } from '../../../context/DataContext'
import type { Task, TaskStatus } from '../../../types'
import { Avatar } from '../../ui/Avatar'
import { TaskRow } from '../../ui/TaskRow'
import { ACTIVE_STATUSES, type PersonSummary } from '../../../lib/teamMetrics'
import { STATUS_COLOR, STATUS_SHORT, STATUS_LABEL } from './teamColors'

type Sort = 'workload' | 'name' | 'completed'

interface TeamRosterProps {
  people: PersonSummary[]
  maxActive: number
  tasks: Task[]
  sort: Sort
  onSortChange: (sort: Sort) => void
  expanded: string | null
  onToggleExpand: (key: string) => void
  onSelectTask: (taskId: string) => void
}

const BAR_WIDTH = 160
const EXPAND_ORDER: TaskStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done']
const EXPAND_LABEL: Record<string, string> = { ...STATUS_LABEL, done: 'Done' }

/** Key used for row identity + expansion; the Unassigned bucket has userId=null. */
const rowKey = (p: PersonSummary) => p.userId ?? '__unassigned__'

function WorkloadBar({ person, maxActive }: { person: PersonSummary; maxActive: number }) {
  return (
    <div
      className="relative h-2 rounded-full overflow-hidden flex"
      style={{ width: BAR_WIDTH, backgroundColor: 'var(--accent-soft)' }}
      title={ACTIVE_STATUSES.map(s => `${STATUS_LABEL[s]}: ${person.active[s]}`).join('\n')}
    >
      {ACTIVE_STATUSES.map(s => {
        const w = (person.active[s] / maxActive) * BAR_WIDTH
        if (w <= 0) return null
        return <span key={s} style={{ width: w, backgroundColor: STATUS_COLOR[s] }} />
      })}
    </div>
  )
}

function StatusChips({ person }: { person: PersonSummary }) {
  return (
    <div className="flex items-center gap-2.5">
      {ACTIVE_STATUSES.map(s => {
        const n = person.active[s]
        return (
          <span
            key={s}
            className={`flex items-center gap-1 mono text-[11px] ${n ? 'text-[var(--text-muted)]' : 'text-[var(--text-faint)]'}`}
            title={STATUS_LABEL[s]}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: n ? STATUS_COLOR[s] : 'var(--border)' }} />
            {n}
            <span className="text-[var(--text-faint)]">{STATUS_SHORT[s]}</span>
          </span>
        )
      })}
    </div>
  )
}

export function TeamRoster({
  people, maxActive, tasks, sort, onSortChange, expanded, onToggleExpand, onSelectTask,
}: TeamRosterProps) {
  const { usersById } = useData()

  const sortBtn = (id: Sort, label: string) => (
    <button
      onClick={() => onSortChange(id)}
      className={`transition-colors duration-150 hover:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] rounded ${
        sort === id ? 'text-[var(--text)]' : 'text-[var(--text-faint)]'
      }`}
    >
      {label}
    </button>
  )

  // Tasks for one person's expanded panel: shared, non-canceled, assigned to them
  // (or unassigned for the Unassigned bucket), grouped by status.
  const tasksFor = (userId: string | null): Partial<Record<TaskStatus, Task[]>> => {
    const groups: Partial<Record<TaskStatus, Task[]>> = {}
    for (const t of tasks) {
      if (t.isPersonal || !t.spaceId || t.status === 'canceled') continue
      const match = userId ? t.assigneeId === userId : !t.assigneeId
      if (!match) continue
      ;(groups[t.status] ??= []).push(t)
    }
    return groups
  }

  return (
    <div className="border border-[var(--border)] rounded-[10px] overflow-hidden">
      {/* Column header */}
      <div className="flex items-center gap-4 px-4 h-9 border-b border-[var(--border)] bg-[var(--surface)] text-[11px] font-medium uppercase tracking-wider text-[var(--text-faint)]">
        <span className="flex-1">{sortBtn('name', 'Name')}</span>
        <span className="w-[220px] hidden md:block">By status</span>
        <span className="w-[160px] hidden sm:block">{sortBtn('workload', 'Workload')}</span>
        <span className="w-10 text-right">Active</span>
        <span className="w-14 text-right">{sortBtn('completed', 'Done')}</span>
        <span className="w-4" />
      </div>

      {people.map(person => {
        const key = rowKey(person)
        const user = person.userId ? usersById[person.userId] : undefined
        const isOpen = expanded === key
        const groups = isOpen ? tasksFor(person.userId) : {}

        return (
          <div key={key} className="border-b border-[var(--border)] last:border-b-0">
            {/* Person row */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleExpand(key)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(key) } }}
              className="flex items-center gap-4 px-4 h-[46px] cursor-pointer select-none hover:bg-[var(--surface)] transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#5B57E0]"
            >
              {/* Name */}
              <span className="flex-1 flex items-center gap-2.5 min-w-0">
                {user ? (
                  <Avatar user={user} size="sm" />
                ) : (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--text-faint)] flex-shrink-0">
                    <Users size={12} />
                  </span>
                )}
                <span className={`text-[14px] truncate ${user ? 'text-[var(--text)]' : 'text-[var(--text-muted)] italic'}`}>
                  {user?.name ?? 'Unassigned'}
                </span>
              </span>

              {/* By status */}
              <span className="w-[220px] hidden md:flex"><StatusChips person={person} /></span>

              {/* Workload bar */}
              <span className="w-[160px] hidden sm:flex"><WorkloadBar person={person} maxActive={maxActive} /></span>

              {/* Active total */}
              <span className="w-10 text-right mono text-[13px] text-[var(--text)]">{person.activeTotal}</span>

              {/* Completed */}
              <span className="w-14 text-right mono text-[13px] text-[var(--text-muted)]">
                {person.userId ? person.completed : (person.completed || '—')}
              </span>

              {/* Expand chevron */}
              <span className="w-4 text-[var(--text-faint)]">
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </div>

            {/* Expanded task list */}
            {isOpen && (
              <div className="bg-[var(--canvas)] px-3 py-2 border-t border-[var(--border)]">
                {person.activeTotal === 0 && person.completed === 0 ? (
                  <p className="text-[12px] text-[var(--text-faint)] px-2 py-1">No shared tasks.</p>
                ) : (
                  EXPAND_ORDER.map(status => {
                    const group = groups[status]
                    if (!group || group.length === 0) return null
                    return (
                      <div key={status} className="mb-1.5 last:mb-0">
                        <div className="flex items-center gap-2 px-2 mb-0.5">
                          <h4 className="text-[11px] font-medium text-[var(--text-muted)]">{EXPAND_LABEL[status]}</h4>
                          <span className="mono text-[11px] text-[var(--text-faint)]">{group.length}</span>
                        </div>
                        <div className="space-y-0.5">
                          {group.map(t => <TaskRow key={t.id} task={t} onClick={onSelectTask} showSpace />)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
