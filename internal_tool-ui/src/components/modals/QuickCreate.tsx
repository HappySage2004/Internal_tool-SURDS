import { useState, useEffect, useRef } from 'react'
import { X, Lock, UserPlus, Flag, ChevronDown, Calendar, Hash } from 'lucide-react'
import type { TaskStatus, TaskPriority } from '../../types'
import { StatusPill } from '../ui/StatusPill'
import { Avatar } from '../ui/Avatar'
import { useData } from '../../context/DataContext'

export interface CreateTaskOpts {
  title: string
  status: TaskStatus
  assigneeId?: string
  priority?: TaskPriority
  dueDate?: string
  spaceId?: string   // undefined = personal task
}

interface QuickCreateProps {
  onClose: () => void
  onCreateTask?: (opts: CreateTaskOpts) => void
}

const STATUS_OPTIONS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']
const PRIORITY_OPTIONS: TaskPriority[] = ['low', 'medium', 'high']

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low:    '#71717A',
  medium: '#C77700',
  high:   '#DC2626',
}

export function QuickCreate({ onClose, onCreateTask }: QuickCreateProps) {
  const { users, spaces } = useData()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<TaskStatus>('backlog')
  const [assigneeId, setAssigneeId] = useState<string | undefined>()
  const [priority, setPriority] = useState<TaskPriority | undefined>()
  const [dueDate, setDueDate] = useState<string>('')
  const [spaceId, setSpaceId] = useState<string | undefined>()
  const [showContext, setShowContext] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const assignee = assigneeId ? users.find(u => u.id === assigneeId) : undefined
  const space = spaceId ? spaces.find(s => s.id === spaceId) : undefined

  const handleSubmit = () => {
    if (!title.trim()) return
    onCreateTask?.({ title: title.trim(), status, assigneeId, priority, dueDate: dueDate || undefined, spaceId })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-[520px]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">New task</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
          >
            <X size={14} />
          </button>
        </div>

        {/* Title input */}
        <div className="px-4 py-4">
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full text-[18px] font-medium text-[var(--text)] bg-transparent outline-none placeholder:text-[var(--text-faint)]"
          />
        </div>

        {/* Chips row */}
        <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
          {/* Context — personal or a space */}
          <div className="relative">
            <button
              onClick={() => { setShowContext(v => !v); setShowStatus(false); setShowAssignee(false); setShowPriority(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
            >
              {space ? <Hash size={12} /> : <Lock size={12} />}
              {space ? space.name : 'Personal'}
              <ChevronDown size={12} className="text-[var(--text-faint)]" />
            </button>
            {showContext && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-10 min-w-[200px] max-h-[260px] overflow-y-auto" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                <button
                  onClick={() => { setSpaceId(undefined); setShowContext(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                >
                  <Lock size={12} className="text-[var(--text-faint)]" />
                  <span className="text-[13px] text-[var(--text)]">Personal</span>
                </button>
                {spaces.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSpaceId(s.id); setShowContext(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                  >
                    <Hash size={12} className="text-[var(--text-faint)]" />
                    <span className="text-[13px] text-[var(--text)]">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="relative">
            <button
              onClick={() => { setShowStatus(v => !v); setShowContext(false); setShowAssignee(false); setShowPriority(false) }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[12px] border border-[var(--border)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
            >
              <StatusPill status={status} size="sm" />
              <ChevronDown size={12} className="text-[var(--text-faint)]" />
            </button>
            {showStatus && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-10 min-w-[140px]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setShowStatus(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(18,18,28,0.06)] transition-colors duration-150"
                  >
                    <StatusPill status={s} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="relative">
            <button
              onClick={() => { setShowAssignee(v => !v); setShowContext(false); setShowStatus(false); setShowPriority(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] border border-dashed border-[var(--border)] hover:border-[var(--text-faint)] hover:text-[var(--text-muted)] transition-all duration-150"
              style={{ color: assignee ? 'var(--text)' : 'var(--text-faint)', borderStyle: assignee ? 'solid' : 'dashed' }}
            >
              {assignee ? (
                <>
                  <Avatar user={assignee} size="sm" />
                  <span>{assignee.name}</span>
                </>
              ) : (
                <>
                  <UserPlus size={12} />
                  Assignee
                </>
              )}
            </button>
            {showAssignee && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-10 min-w-[180px]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {assigneeId && (
                  <button
                    onClick={() => { setAssigneeId(undefined); setShowAssignee(false) }}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                  >
                    Remove
                  </button>
                )}
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setAssigneeId(u.id); setShowAssignee(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                  >
                    <Avatar user={u} size="sm" />
                    <span className="text-[13px] text-[var(--text)]">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <button
              onClick={() => { setShowPriority(v => !v); setShowContext(false); setShowStatus(false); setShowAssignee(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] border hover:text-[var(--text-muted)] hover:border-[var(--text-faint)] transition-all duration-150"
              style={{
                color: priority ? PRIORITY_COLORS[priority] : 'var(--text-faint)',
                borderColor: priority ? PRIORITY_COLORS[priority] + '60' : 'var(--border)',
                borderStyle: priority ? 'solid' : 'dashed',
                backgroundColor: priority ? PRIORITY_COLORS[priority] + '10' : 'transparent',
              }}
            >
              <Flag size={12} />
              {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Priority'}
            </button>
            {showPriority && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-10 min-w-[120px]" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {priority && (
                  <button
                    onClick={() => { setPriority(undefined); setShowPriority(false) }}
                    className="w-full px-3 py-1.5 text-left text-[12px] text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                  >
                    None
                  </button>
                )}
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriority(p); setShowPriority(false) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                  >
                    <Flag size={11} style={{ color: PRIORITY_COLORS[p] }} />
                    <span className="text-[13px] text-[var(--text)] capitalize">{p}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due date */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] border transition-all duration-150"
            style={{ borderColor: 'var(--border)', borderStyle: dueDate ? 'solid' : 'dashed' }}
          >
            <Calendar size={12} className="text-[var(--text-faint)]" />
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              aria-label="Due date"
              className="bg-transparent text-[12px] outline-none"
              style={{ color: dueDate ? 'var(--text)' : 'var(--text-faint)' }}
            />
            {dueDate && (
              <button
                onClick={() => setDueDate('')}
                className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                aria-label="Clear due date"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--canvas)] rounded-b-[10px]">
          <span className="text-[11px] text-[var(--text-faint)]">
            Press <kbd className="mono text-[10px] px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↵ Enter</kbd> to create
          </span>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
          >
            Create task
          </button>
        </div>
      </div>
    </div>
  )
}
