import { useState, useEffect, useCallback } from 'react'
import {
  X, Lock, GitBranch, GitPullRequest, GitMerge,
  MessageSquare, Hash, CornerUpLeft, Trash2,
} from 'lucide-react'
import type { TaskStatus, TaskPriority, Comment, Task, GitLink } from '../../types'
import { Avatar } from '../ui/Avatar'
import { StatusPill } from '../ui/StatusPill'
import { Badge } from '../ui/Badge'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../api'

interface TaskDetailProps {
  taskId: string
  onClose: () => void
  // Retarget the panel to another task (parent breadcrumb / a sub-task row).
  onSelectTask?: (taskId: string) => void
}

const ALL_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled']
const ALL_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog:     '#71717A',
  todo:        '#71717A',
  in_progress: '#2F6FED',
  in_review:   '#C77700',
  done:        '#157F4B',
  canceled:    '#A1A1AA',
}

export function TaskDetail({ taskId, onClose, onSelectTask }: TaskDetailProps) {
  const { tasksById, usersById, spacesById, spaces, users, updateTask: ctxUpdateTask } = useData()

  // Seed from context cache; overwritten once full fetch resolves
  const cached = tasksById[taskId]
  const [title, setTitle] = useState(cached?.title ?? '')
  const [status, setStatus] = useState<TaskStatus>(cached?.status ?? 'backlog')
  const [priority, setPriority] = useState<TaskPriority | undefined>(cached?.priority)
  const [assigneeId, setAssigneeId] = useState<string | undefined>(cached?.assigneeId)
  const [dueDate, setDueDate] = useState<string>('')
  const [spaceId, setSpaceId] = useState<string | undefined>(cached?.spaceId)
  const [description, setDescription] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showSpace, setShowSpace] = useState(false)
  const [gitLinks, setGitLinks] = useState<GitLink[]>(cached?.gitLinks ?? [])
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkType, setNewLinkType] = useState<'pull_request' | 'branch'>('pull_request')
  const [newLinkId, setNewLinkId] = useState('')
  const [loadingFull, setLoadingFull] = useState(true)
  // Full task from the fetch — authoritative for key/tag/git-links even when the
  // task isn't in the current user's my-work cache (e.g. assigned to someone else).
  const [fetchedTask, setFetchedTask] = useState<Task | undefined>(cached)
  // Sub-tasks (one level, §6 #13). A sub-task itself shows a parent breadcrumb
  // instead of a Subtasks section.
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [parentTask, setParentTask] = useState<Task | undefined>(undefined)

  const loadSubtasks = useCallback(() => {
    api.getSubtasks(taskId)
      .then(rows => setSubtasks(rows.map(api.mapTask)))
      .catch(console.error)
  }, [taskId])

  // Fetch full task (description + comments) whenever taskId changes
  useEffect(() => {
    setLoadingFull(true)
    setSubtasks([])
    setParentTask(undefined)
    api.getTask(taskId).then(raw => {
      setTitle(raw.title)
      setStatus(raw.status as TaskStatus)
      setPriority(raw.priority as TaskPriority | undefined)
      setAssigneeId(raw.assigneeId ?? undefined)
      setDueDate(raw.dueDate ?? '')
      setSpaceId(raw.spaceId ?? undefined)
      setDescription(raw.description ?? '')
      setComments((raw.comments ?? []).map(api.mapComment))
      const mapped = api.mapTask(raw)
      setFetchedTask(mapped)
      setGitLinks(mapped.gitLinks ?? [])
      if (mapped.parentTaskId) {
        // This is a sub-task — resolve the parent for the breadcrumb.
        api.getTask(mapped.parentTaskId).then(p => setParentTask(api.mapTask(p))).catch(console.error)
      } else {
        // A top-level task — load its sub-tasks.
        loadSubtasks()
      }
    }).catch(console.error).finally(() => setLoadingFull(false))
  }, [taskId, loadSubtasks])

  const task = fetchedTask ?? cached
  const assignee = assigneeId ? usersById[assigneeId] : undefined
  const space = spaceId ? spacesById[spaceId] : undefined
  const isPersonal = !spaceId
  const tagSpace = task?.tagSpaceId ? spacesById[task.tagSpaceId] : undefined
  const isEngineering = space?.mode === 'engineering'
  const { userId } = useAuth()
  const currentUser = userId ? usersById[userId] : undefined
  const isSubtask = !!task?.parentTaskId
  const doneSubtaskCount = subtasks.filter(s => s.status === 'done').length

  if (!task && loadingFull) return null

  // ── Handlers ────────────────────────────────────────────────────────────────

  const saveField = (patch: Parameters<typeof api.updateTask>[1]) => {
    api.updateTask(taskId, patch).catch(console.error)
  }

  const handleStatusChange = (s: TaskStatus) => {
    setStatus(s)
    ctxUpdateTask(taskId, { status: s })
    saveField({ status: s })
  }

  const handlePriorityChange = (p: TaskPriority) => {
    setPriority(p)
    ctxUpdateTask(taskId, { priority: p })
    saveField({ priority: p })
  }

  const handleAssigneeChange = (uid: string | undefined) => {
    setAssigneeId(uid)
    setShowAssignee(false)
    ctxUpdateTask(taskId, { assigneeId: uid })
    saveField({ assignee_id: uid ?? null })
  }

  const handleSpaceChange = (newSpaceId: string | undefined) => {
    const prev = spaceId
    setSpaceId(newSpaceId)
    setShowSpace(false)
    ctxUpdateTask(taskId, { spaceId: newSpaceId, isPersonal: !newSpaceId })
    // space_id null moves the task to personal; backend invariants (e.g. a personal
    // task can't stay assigned to someone else) may reject — revert if so.
    api.updateTask(taskId, { space_id: newSpaceId ?? null }).catch(err => {
      console.error(err)
      setSpaceId(prev)
      ctxUpdateTask(taskId, { spaceId: prev, isPersonal: !prev })
    })
  }

  const handleAddGitLink = async () => {
    const id = newLinkId.trim()
    if (!id) return
    const url = newLinkType === 'pull_request' ? `#${id}` : id
    setNewLinkId('')
    setShowAddLink(false)
    try {
      const created = await api.addGitLink(taskId, {
        ref_type: newLinkType, url, external_id: id, state: 'open',
      })
      if (newLinkType === 'pull_request') {
        // Linking a PR is the "PR opened" event — fire the webhook so status
        // auto-advances (todo/in_progress → in_review) and reflect the new task.
        const updated = await api.updateGitLinkState(taskId, id, 'open')
        const mapped = api.mapTask(updated)
        setGitLinks(mapped.gitLinks ?? [])
        setStatus(mapped.status)
        setFetchedTask(mapped)
        ctxUpdateTask(taskId, { status: mapped.status })
      } else {
        setGitLinks(prev => [...prev, {
          id:         `${taskId}-gl-${prev.length}`,
          refType:    created.refType as GitLink['refType'],
          state:      (created.state ?? 'open') as GitLink['state'],
          label:      created.externalId ? `#${created.externalId}` : created.url,
          url:        created.url,
          externalId: created.externalId,
        }])
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Simulates a git provider webhook; the backend auto-advances task status
  // (PR open → in_review, merged → done) per §6 rule 12 and returns the new task.
  const handleGitState = async (link: GitLink, state: 'open' | 'merged' | 'closed') => {
    if (!link.externalId || link.state === state) return
    try {
      const updated = await api.updateGitLinkState(taskId, link.externalId, state)
      const mapped = api.mapTask(updated)
      setGitLinks(mapped.gitLinks ?? [])
      setStatus(mapped.status)
      setFetchedTask(mapped)
      ctxUpdateTask(taskId, { status: mapped.status })
    } catch (e) {
      console.error(e)
    }
  }

  const handleDueDateChange = (value: string) => {
    setDueDate(value)
    // Reflect in lists immediately; mapTask derives dueGroup from the date.
    ctxUpdateTask(taskId, { dueGroup: api.getDueGroup(value || undefined) })
    saveField({ due_date: value || null })
  }

  const handleTitleBlur = () => {
    if (title && task && title !== task.title) {
      ctxUpdateTask(taskId, { title })
      saveField({ title })
    }
  }

  const handleDescriptionBlur = () => {
    saveField({ description })
  }

  // ── Sub-tasks (read-only here; creation happens from the board "+") ───────────

  const handleToggleSubtask = (sub: Task) => {
    const next: TaskStatus = sub.status === 'done' ? 'todo' : 'done'
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: next } : s))
    ctxUpdateTask(sub.id, { status: next })
    api.updateTask(sub.id, { status: next }).catch(e => {
      console.error(e)
      setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: sub.status } : s))
    })
  }

  const handleRemoveSubtask = (sub: Task) => {
    setSubtasks(prev => prev.filter(s => s.id !== sub.id))
    api.cancelTask(sub.id).catch(e => {
      console.error(e)
      setSubtasks(prev => [...prev, sub])
    })
  }

  // @mention detection and autocomplete
  const handleCommentInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCommentInput(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      setMentionQuery(val.slice(lastAt + 1))
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (user: { name: string }) => {
    const lastAt = commentInput.lastIndexOf('@')
    setCommentInput(commentInput.slice(0, lastAt) + `@${user.name} `)
    setMentionQuery(null)
  }

  const handleCommentKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const body = commentInput.trim()
    if (!body) return
    try {
      const raw = await api.addTaskComment(taskId, { body })
      setComments(prev => [...prev, api.mapComment(raw)])
      setCommentInput('')
      setMentionQuery(null)
    } catch (err) {
      console.error(err)
    }
  }

  const mentionMatches = mentionQuery !== null
    ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : []

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-150" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-screen w-[480px] z-50 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col overflow-hidden"
        style={{ animation: 'slideIn 150ms ease-out' }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2">
            {task?.key && <span className="mono text-[12px] text-[var(--text-faint)]">{task.key}</span>}
            <StatusPill status={status} size="sm" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-8">
            {/* Parent breadcrumb — shown when this task is a sub-task (§6 #13) */}
            {isSubtask && parentTask && (
              <button
                onClick={() => onSelectTask?.(parentTask.id)}
                className="flex items-center gap-1.5 mb-3 text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B57E0] rounded"
              >
                <CornerUpLeft size={12} />
                {parentTask.key && <span className="mono text-[11px]">{parentTask.key}</span>}
                <span className="truncate max-w-[320px]">{parentTask.title}</span>
              </button>
            )}

            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-[21px] font-medium text-[var(--text)] bg-transparent outline-none pb-1 mb-4 border-b border-transparent focus:border-[var(--accent)] transition-colors"
            />

            {/* Status */}
            <div className="mb-5">
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="text-[12px] font-medium px-2.5 py-1 rounded-[6px] border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
                    style={{
                      color: s === status ? STATUS_COLORS[s] : 'var(--text-muted)',
                      borderColor: s === status ? `${STATUS_COLORS[s]}40` : 'var(--border)',
                      backgroundColor: s === status ? `${STATUS_COLORS[s]}12` : 'transparent',
                    }}
                  >
                    {s === 'in_progress' ? 'In progress' : s === 'in_review' ? 'In review' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields grid */}
            <div className="border border-[var(--border)] rounded-[8px] divide-y divide-[var(--border)] mb-5">
              {/* Assignee */}
              <div className="flex items-center px-3 py-2.5 relative">
                <span className="text-[12px] text-[var(--text-muted)] w-24 flex-shrink-0">Assignee</span>
                {assignee ? (
                  <button
                    onClick={() => setShowAssignee(v => !v)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <Avatar user={assignee} size="sm" />
                    <span className="text-[13px] text-[var(--text)]">{assignee.name}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAssignee(v => !v)}
                    className="text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                  >
                    + Add assignee
                  </button>
                )}
                {showAssignee && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-20 min-w-[200px]"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  >
                    {assignee && (
                      <button
                        onClick={() => handleAssigneeChange(undefined)}
                        className="w-full px-3 py-2 text-left text-[12px] text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                      >
                        Remove assignee
                      </button>
                    )}
                    {users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleAssigneeChange(u.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                      >
                        <Avatar user={u} size="sm" />
                        <span className="text-[13px] text-[var(--text)]">{u.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority — sub-tasks only carry status/assignee/due date */}
              {!isSubtask && (
                <div className="flex items-center px-3 py-2.5">
                  <span className="text-[12px] text-[var(--text-muted)] w-24 flex-shrink-0">Priority</span>
                  <div className="flex items-center gap-1.5">
                    {priority ? (
                      ALL_PRIORITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => handlePriorityChange(p)}
                          className={`text-[12px] px-2 py-0.5 rounded border transition-all duration-150 ${
                            priority === p
                              ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                          }`}
                        >
                          {p}
                        </button>
                      ))
                    ) : (
                      <button
                        onClick={() => handlePriorityChange('medium')}
                        className="text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                      >
                        + Add priority
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Due date */}
              <div className="flex items-center px-3 py-2.5">
                <span className="text-[12px] text-[var(--text-muted)] w-24 flex-shrink-0">Due date</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => handleDueDateChange(e.target.value)}
                    className="text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all"
                  />
                  {dueDate && (
                    <button
                      onClick={() => handleDueDateChange('')}
                      className="text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Space — hidden for sub-tasks (they inherit the parent's space) */}
              {!isSubtask && (
              <div className="flex items-center px-3 py-2.5 relative">
                <span className="text-[12px] text-[var(--text-muted)] w-24 flex-shrink-0">Space</span>
                <button
                  onClick={() => setShowSpace(v => !v)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {isPersonal ? (
                    <>
                      <Lock size={12} className="text-[var(--text-faint)]" />
                      <span className="text-[13px] text-[var(--text-muted)]">Private</span>
                    </>
                  ) : space ? (
                    <>
                      <Hash size={12} className="text-[var(--text-faint)]" />
                      <span className="text-[13px] text-[var(--text)]">{space.name}</span>
                    </>
                  ) : (
                    <span className="text-[12px] text-[var(--text-faint)]">None</span>
                  )}
                </button>
                {isPersonal && tagSpace && <Badge variant="default">tagged: {tagSpace.name}</Badge>}
                {showSpace && (
                  <div
                    className="absolute left-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-20 min-w-[200px] max-h-[260px] overflow-y-auto"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  >
                    <button
                      onClick={() => handleSpaceChange(undefined)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                    >
                      <Lock size={12} className="text-[var(--text-faint)]" />
                      <span className="text-[13px] text-[var(--text)]">Personal</span>
                    </button>
                    {spaces.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSpaceChange(s.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                      >
                        <Hash size={12} className="text-[var(--text-faint)]" />
                        <span className="text-[13px] text-[var(--text)]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Description — hidden for sub-tasks */}
            {!isSubtask && (
              <div className="mb-5">
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Description</p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full text-[13px] text-[var(--text)] bg-transparent resize-none border border-[var(--border)] rounded-[6px] p-3 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
                />
              </div>
            )}

            {/* Sub-tasks — read-only list on top-level tasks (one level, §6 #13).
                Creating a sub-task happens from the "+" on a board task row. */}
            {!isSubtask && subtasks.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Subtasks</p>
                  <span className="mono text-[11px] text-[var(--text-faint)]">{doneSubtaskCount}/{subtasks.length}</span>
                </div>

                <div className="space-y-0.5">
                    {subtasks.map(sub => {
                      const subAssignee = sub.assigneeId ? usersById[sub.assigneeId] : undefined
                      const subDone = sub.status === 'done'
                      const subCanceled = sub.status === 'canceled'
                      return (
                        <div key={sub.id} className="group flex items-center gap-2 py-1 pl-1 rounded-[6px] hover:bg-[rgba(18,18,28,0.04)] transition-colors">
                          {/* Toggle done */}
                          <button
                            onClick={() => handleToggleSubtask(sub)}
                            aria-label={subDone ? 'Mark not done' : 'Mark done'}
                            className="flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
                            style={{
                              borderColor: subDone ? '#157F4B' : 'var(--text-faint)',
                              backgroundColor: subDone ? '#157F4B' : 'transparent',
                            }}
                          />
                          {/* Title → open the sub-task */}
                          <button
                            onClick={() => onSelectTask?.(sub.id)}
                            className={`flex-1 text-left text-[13px] truncate transition-colors hover:text-[var(--accent)] ${
                              subDone || subCanceled ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'
                            }`}
                          >
                            {sub.title}
                          </button>
                          {subAssignee && <Avatar user={subAssignee} size="sm" />}
                          <button
                            onClick={() => handleRemoveSubtask(sub)}
                            aria-label="Remove subtask"
                            className="flex-shrink-0 p-1 rounded text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:text-[#C53434] transition-all focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Git links — hidden for sub-tasks */}
            {isEngineering && !isSubtask && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Git links</p>
                  <button
                    onClick={() => setShowAddLink(v => !v)}
                    className="flex items-center gap-1 text-[11px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
                  >
                    <GitBranch size={11} />
                    Link branch / PR
                  </button>
                </div>

                {gitLinks.length === 0 && !showAddLink ? (
                  <p className="text-[12px] text-[var(--text-faint)]">No git links yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {gitLinks.map(link => {
                      const Icon = link.refType === 'branch' ? GitBranch : link.state === 'merged' ? GitMerge : GitPullRequest
                      const variant = link.state === 'merged' ? 'green' : link.state === 'open' ? 'amber' : 'muted'
                      return (
                        <div key={link.id} className="flex items-center gap-2 flex-wrap">
                          <a href={link.url} className="no-underline" onClick={e => e.preventDefault()}>
                            <Badge variant={variant as 'green' | 'amber' | 'muted'}>
                              <Icon size={11} />
                              {link.label}
                            </Badge>
                          </a>
                          {link.refType === 'pull_request' && link.externalId && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[var(--text-faint)] mr-0.5">simulate:</span>
                              {(['open', 'merged', 'closed'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => handleGitState(link, s)}
                                  disabled={link.state === s}
                                  className="text-[11px] px-1.5 py-0.5 rounded border transition-all duration-150 disabled:cursor-default"
                                  style={{
                                    color: link.state === s ? 'var(--accent)' : 'var(--text-muted)',
                                    borderColor: link.state === s ? 'var(--accent)' : 'var(--border)',
                                    backgroundColor: link.state === s ? 'var(--accent-soft)' : 'transparent',
                                  }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {showAddLink && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      {(['pull_request', 'branch'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setNewLinkType(t)}
                          className="text-[11px] px-2 py-1 rounded-[6px] border transition-all duration-150"
                          style={{
                            color: newLinkType === t ? 'var(--accent)' : 'var(--text-muted)',
                            borderColor: newLinkType === t ? 'var(--accent)' : 'var(--border)',
                            backgroundColor: newLinkType === t ? 'var(--accent-soft)' : 'transparent',
                          }}
                        >
                          {t === 'pull_request' ? 'PR' : 'Branch'}
                        </button>
                      ))}
                    </div>
                    <input
                      autoFocus
                      value={newLinkId}
                      onChange={e => setNewLinkId(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddGitLink()
                        if (e.key === 'Escape') { setShowAddLink(false); setNewLinkId('') }
                      }}
                      placeholder={newLinkType === 'pull_request' ? 'PR number (e.g. 214)' : 'branch name'}
                      className="flex-1 min-w-[120px] text-[12px] bg-transparent border border-[var(--border)] rounded-[6px] px-2.5 py-1 outline-none placeholder:text-[var(--text-faint)] text-[var(--text)] focus:ring-2 focus:ring-[#5B57E0] transition-all"
                    />
                    <button
                      onClick={handleAddGitLink}
                      disabled={!newLinkId.trim()}
                      className="text-[12px] px-2.5 py-1 rounded-[6px] bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 transition-all"
                    >
                      Link
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Comments — hidden for sub-tasks (no dedicated thread) */}
            {!isSubtask && (
            <div className="mb-6">
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-3">
                Comments{comments.length > 0 && <span className="mono ml-1">({comments.length})</span>}
              </p>

              {/* Existing comments */}
              <div className="space-y-3 mb-3">
                {comments.map(c => {
                  const author = usersById[c.authorId]
                  return (
                    <div key={c.id} className="flex items-start gap-3">
                      {author && <Avatar user={author} size="sm" />}
                      <div className="flex-1 border border-[var(--border)] rounded-[6px] p-3 bg-[var(--canvas)]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12px] font-medium text-[var(--text)]">{author?.name ?? 'Unknown'}</span>
                          <span className="mono text-[11px] text-[var(--text-faint)]">{c.createdAt}</span>
                        </div>
                        <p className="text-[13px] text-[var(--text-muted)] whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* New comment input */}
              <div className="flex items-start gap-3">
                {currentUser && <Avatar user={currentUser} size="sm" />}
                <div className="flex-1 relative">
                  <input
                    value={commentInput}
                    onChange={handleCommentInput}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Add a comment… (↵ to send, @name to mention)"
                    className="w-full text-[13px] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 placeholder:text-[var(--text-faint)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
                  />
                  {/* @mention autocomplete */}
                  {mentionMatches.length > 0 && (
                    <div
                      className="absolute bottom-full left-0 mb-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-20 min-w-[180px]"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    >
                      {mentionMatches.map(u => (
                        <button
                          key={u.id}
                          onMouseDown={e => { e.preventDefault(); insertMention(u) }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                        >
                          <Avatar user={u} size="sm" />
                          <span className="text-[13px] text-[var(--text)]">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between flex-shrink-0">
          <span className="text-[12px] text-[var(--text-faint)]">
            {isSubtask ? 'Subtask' : isPersonal ? 'Private task' : space ? space.name : 'Shared'}
          </span>
          {!isSubtask && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-faint)]">
              <MessageSquare size={12} />
              <span className="mono">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
