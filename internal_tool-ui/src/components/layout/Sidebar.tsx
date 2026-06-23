import { useState } from 'react'
import {
  Pencil, Plus, CheckSquare, Target, Layout, CalendarDays,
  Settings, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { Avatar } from '../ui/Avatar'
import { HealthDot } from '../ui/HealthDot'
import type { Health } from '../../types'

type View = 'my-work' | 'goals' | 'spaces' | 'space-detail' | 'meetings'

interface SidebarProps {
  currentView: View
  selectedSpaceId: string | null
  onNavigate: (view: View) => void
  onSelectSpace: (spaceId: string) => void
  onNewTask: () => void
}

const NAV_ITEMS = [
  { id: 'my-work'  as View, label: 'My work',  icon: CheckSquare  },
  { id: 'goals'    as View, label: 'Goals',    icon: Target       },
  { id: 'spaces'   as View, label: 'Spaces',   icon: Layout       },
  { id: 'meetings' as View, label: 'Meetings', icon: CalendarDays },
]

export function Sidebar({ currentView, selectedSpaceId, onNavigate, onSelectSpace, onNewTask }: SidebarProps) {
  const { spaces, usersById } = useData()
  const [engOpen, setEngOpen] = useState(true)
  const [wsOpen, setWsOpen]   = useState(true)

  const engineeringSpaces = spaces.filter(s => s.mode === 'engineering')
  const workstreamSpaces  = spaces.filter(s => s.mode === 'workstream')
  const getHealth = (spaceId: string): Health =>
    (spaces.find(s => s.id === spaceId)?.latestStatusPost?.health ?? 'on_track') as Health

  const aaryan = usersById['aaryan']

  return (
    <aside
      className="
        flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)]
        w-[220px] min-w-[220px] flex-shrink-0
      "
    >
      {/* Workspace header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--border)]">
        <span className="text-[15px] font-medium text-[var(--text)]">Surds</span>
        <button
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
          title="Edit workspace"
          onClick={() => {}}
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* New task button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={onNewTask}
          className="
            w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium
            text-[var(--text-muted)] border border-[var(--border)]
            hover:bg-[rgba(18,18,28,0.06)] hover:text-[var(--text)]
            transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
          "
        >
          <Plus size={14} />
          <span>New task</span>
          <kbd className="ml-auto mono text-[10px] px-1 py-0.5 rounded bg-[rgba(18,18,28,0.06)] border border-[var(--border)] leading-none">C</kbd>
        </button>
      </div>

      {/* Nav items */}
      <nav className="px-2 py-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = currentView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium
                transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
                ${isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] hover:text-[var(--text)]'
                }
              `}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="my-1 border-t border-[var(--border)]" />

      {/* Spaces section */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Engineering group */}
        <div className="mb-1">
          <button
            onClick={() => setEngOpen(v => !v)}
            className="
              w-full flex items-center gap-1.5 px-2 py-1 rounded
              text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider
              hover:text-[var(--text-muted)] transition-all duration-150
            "
          >
            {engOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Engineering
          </button>
          {engOpen && (
            <div>
              {engineeringSpaces.map(space => {
                const isActive = currentView === 'space-detail' && selectedSpaceId === space.id
                return (
                  <button
                    key={space.id}
                    onClick={() => { onSelectSpace(space.id); onNavigate('space-detail') }}
                    className={`
                      w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[13px]
                      transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
                      ${isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] hover:text-[var(--text)]'
                      }
                    `}
                  >
                    <HealthDot health={getHealth(space.id)} size={6} />
                    <span className="truncate">{space.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Workstreams group */}
        <div>
          <button
            onClick={() => setWsOpen(v => !v)}
            className="
              w-full flex items-center gap-1.5 px-2 py-1 rounded
              text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider
              hover:text-[var(--text-muted)] transition-all duration-150
            "
          >
            {wsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Workstreams
          </button>
          {wsOpen && (
            <div>
              {workstreamSpaces.map(space => {
                const isActive = currentView === 'space-detail' && selectedSpaceId === space.id
                return (
                  <button
                    key={space.id}
                    onClick={() => { onSelectSpace(space.id); onNavigate('space-detail') }}
                    className={`
                      w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[13px]
                      transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
                      ${isActive
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                        : 'text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] hover:text-[var(--text)]'
                      }
                    `}
                  >
                    <HealthDot health={getHealth(space.id)} size={6} />
                    <span className="truncate">{space.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom user row */}
      <div className="px-3 py-3 border-t border-[var(--border)] flex items-center gap-2">
        <Avatar user={aaryan} size="sm" />
        <span className="flex-1 text-[13px] font-medium text-[var(--text)] truncate">{aaryan.name}</span>
        <button
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

    </aside>
  )
}
