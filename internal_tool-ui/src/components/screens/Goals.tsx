import { Target } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { HealthDot } from '../ui/HealthDot'
import { Avatar } from '../ui/Avatar'

interface GoalsProps {
  onSelectSpace: (spaceId: string) => void
  onNavigateSpaceDetail: () => void
}

function formatValue(value: number, unit: string): string {
  if (unit === '$') {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${Math.round(value / 1000)}k`
    return `$${value}`
  }
  return `${value}${unit}`
}

function KRProgress({ current, target, unit }: { current: number; target: number; unit: string }) {
  const isOverBudget = current > target
  const pct = Math.min((current / target) * 100, 100)
  const barColor = isOverBudget ? '#C53434' : '#157F4B'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 rounded-full bg-[rgba(18,18,28,0.08)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span
        className="mono text-[12px] flex-shrink-0"
        style={{ color: isOverBudget ? '#C53434' : '#157F4B' }}
      >
        {formatValue(current, unit)} / {formatValue(target, unit)}
      </span>
    </div>
  )
}

export function Goals({ onSelectSpace, onNavigateSpaceDetail }: GoalsProps) {
  const { goals, spacesById, usersById, threadPostsBySpaceId } = useData()
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-[21px] font-medium text-[var(--text)]">Goals</h1>
          <span className="mono text-[12px] text-[var(--text-faint)]">Q3 2025</span>
        </div>

        <div className="space-y-0">
          {goals.map((goal, idx) => {
            const relatedSpaces = goal.spaceIds.map(id => spacesById[id]).filter(Boolean)

            return (
              <div key={goal.id}>
                {idx > 0 && <div className="border-t border-[var(--border)] my-6" />}

                <div className="space-y-4">
                  {/* Goal header */}
                  <div className="flex items-start gap-3">
                    <Target size={18} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h2 className="text-[18px] font-medium text-[var(--text)] leading-snug">
                        {goal.title}
                      </h2>
                    </div>
                  </div>

                  {/* Key results */}
                  <div className="ml-7 space-y-3">
                    {goal.keyResults.map((kr, krIdx) => (
                      <div key={kr.id}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="mono text-[11px] text-[var(--text-faint)]">KR{krIdx + 1}</span>
                          <span className="text-[13px] text-[var(--text)]">{kr.title}</span>
                        </div>
                        <KRProgress current={kr.current} target={kr.target} unit={kr.unit} />
                      </div>
                    ))}
                  </div>

                  {/* Related spaces */}
                  {relatedSpaces.length > 0 && (
                    <div className="ml-7">
                      <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">
                        From your spaces
                      </p>
                      <div className="space-y-2">
                        {relatedSpaces.map(space => {
                          if (!space) return null
                          const statusPosts = threadPostsBySpaceId(space.id).filter(p => p.kind === 'status')
                          const update = statusPosts[statusPosts.length - 1] ?? space.latestStatusPost
                          const health = update?.health ?? 'on_track'
                          const author = update ? usersById[update.authorId] : undefined

                          return (
                            <button
                              key={space.id}
                              onClick={() => { onSelectSpace(space.id); onNavigateSpaceDetail() }}
                              className="
                                w-full flex items-start gap-3 px-3 py-2.5 rounded-[6px] text-left
                                border border-[var(--border)] bg-[var(--surface)]
                                hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]/20
                                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
                              "
                            >
                              <HealthDot health={health} size={6} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[13px] font-medium text-[var(--text)]">{space.name}</span>
                                  {update && (
                                    <span className="mono text-[11px] text-[var(--text-faint)]">{update.createdAt}</span>
                                  )}
                                </div>
                                {update && (
                                  <p className="text-[12px] text-[var(--text-muted)] leading-snug truncate">
                                    {update.body}
                                  </p>
                                )}
                              </div>
                              {author && (
                                <Avatar user={author} size="sm" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
