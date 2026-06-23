import { useState, useEffect, type MouseEvent as ReactMouseEvent } from 'react'
import { GitBranch, GitPullRequest, GitMerge, Plus, Code2, FileText, X } from 'lucide-react'
import { useData } from '../../context/DataContext'
import * as apiClient from '../../api'
import type { Task, TaskStatus, GitLink, ThreadPost } from '../../types'
import { Avatar } from '../ui/Avatar'
import { HealthDot } from '../ui/HealthDot'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { TaskRow } from '../ui/TaskRow'
import { ThreadFeed } from '../ui/ThreadFeed'

interface SpaceDetailProps {
  spaceId: string
  onSelectTask: (taskId: string) => void
}

const STATUS_ORDER: TaskStatus[] = ['in_progress', 'in_review', 'todo', 'backlog', 'done', 'canceled']
const STATUS_LABELS: Record<TaskStatus, string> = {
  in_progress: 'In progress',
  in_review:   'In review',
  todo:        'Todo',
  backlog:     'Backlog',
  done:        'Done',
  canceled:    'Canceled',
}

function GitBadge({ link }: { link: GitLink }) {
  const Icon = link.refType === 'branch'
    ? GitBranch
    : link.state === 'merged'
      ? GitMerge
      : GitPullRequest

  const variant = link.state === 'merged'
    ? 'green'
    : link.state === 'open'
      ? 'amber'
      : 'muted'

  return (
    <Badge variant={variant as 'green' | 'amber' | 'muted'}>
      <Icon size={11} />
      {link.label}
    </Badge>
  )
}

const RAIL_MIN = 240
const RAIL_MAX = 640

export function SpaceDetail({ spaceId, onSelectTask }: SpaceDetailProps) {
  const { spaces, tasks: myTasks, taskOverrides, usersById, goalsById, documents, threadPostsBySpaceId, addPost, refreshSpaceTasks } = useData()
  const [spaceTasks, setSpaceTasks] = useState<typeof myTasks>([])
  const [docsOpen, setDocsOpen] = useState(true)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postBody, setPostBody] = useState('')
  const [postHealth, setPostHealth] = useState<'on_track' | 'at_risk' | 'off_track'>('on_track')
  const [localPosts, setLocalPosts] = useState<ThreadPost[]>([])
  const [railWidth, setRailWidth] = useState(340)
  const [addingTask, setAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  function handleRailResizeMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = railWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    function onMouseMove(ev: globalThis.MouseEvent) {
      setRailWidth(Math.max(RAIL_MIN, Math.min(RAIL_MAX, startWidth + (startX - ev.clientX))))
    }
    function onMouseUp() {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Fetch full space task list when spaceId changes
  useEffect(() => {
    refreshSpaceTasks(spaceId).then(setSpaceTasks).catch(console.error)
  }, [spaceId, refreshSpaceTasks])

  const space = spaces.find(s => s.id === spaceId)

  if (!space) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
        Space not found
      </div>
    )
  }

  const owner = space.ownerId ? usersById[space.ownerId] : undefined
  const health = space.latestStatusPost?.health ?? 'on_track'
  // spaceTasks populated by useEffect above; fall back to filtering myTasks while loading.
  // Apply taskOverrides so edits made in the detail panel show without a refetch.
  const baseTasks = spaceTasks.length > 0 ? spaceTasks : myTasks.filter(t => t.spaceId === spaceId)
  const effectiveTasks = baseTasks.map(t =>
    taskOverrides[t.id] ? { ...t, ...taskOverrides[t.id] } : t
  )
  const spaceDocs = documents.filter(d => d.spaceId === spaceId)
  const relatedGoals = space.goalIds.map(id => goalsById[id]).filter(Boolean)
  const threadPostsData = [...threadPostsBySpaceId(spaceId), ...localPosts]

  // Group tasks by status
  const tasksByStatus: Partial<Record<TaskStatus, Task[]>> = {}
  for (const t of effectiveTasks) {
    if (!tasksByStatus[t.status]) tasksByStatus[t.status] = []
    tasksByStatus[t.status]!.push(t)
  }

  const handleAddTask = async () => {
    const title = newTaskTitle.trim()
    // Close immediately so an Enter-then-blur (on unmount) can't double-submit:
    // the second call sees an empty title and bails.
    setNewTaskTitle('')
    setAddingTask(false)
    if (!title) return
    try {
      const raw = await apiClient.createTask({ title, space_id: spaceId, status: 'todo' })
      setSpaceTasks(prev => [apiClient.mapTask(raw), ...prev])
    } catch (e) {
      console.error(e)
    }
  }

  const handleSendPost = async (body: string) => {
    const optimistic: ThreadPost = { id: `local-${Date.now()}`, spaceId, authorId: 'aaryan', kind: 'message', body, createdAt: 'just now' }
    setLocalPosts(prev => [...prev, optimistic])
    try {
      const raw = await apiClient.createPost({ space_id: spaceId, kind: 'message', body })
      addPost(apiClient.mapPost(raw))
    } catch (e) { console.error(e) }
  }

  const handlePostUpdate = async () => {
    if (!postBody.trim()) return
    const optimistic: ThreadPost = { id: `local-status-${Date.now()}`, spaceId, authorId: 'aaryan', kind: 'status', body: postBody, health: postHealth, createdAt: 'just now' }
    setLocalPosts(prev => [...prev, optimistic])
    setPostBody('')
    setShowPostModal(false)
    try {
      const raw = await apiClient.createPost({ space_id: spaceId, kind: 'status', body: optimistic.body, health: postHealth })
      addPost(apiClient.mapPost(raw))
    } catch (e) { console.error(e) }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main column */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-8 pb-12">
          {/* Space header */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <HealthDot health={health} size={10} />
                <h1 className="text-[21px] font-medium text-[var(--text)]">{space.name}</h1>
                <Badge variant={space.mode === 'engineering' ? 'accent' : 'default'}>
                  {space.mode === 'engineering' ? 'engineering' : 'workstream'}
                </Badge>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowPostModal(true)}>
                Post update
              </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {owner && (
                <div className="flex items-center gap-1.5">
                  <Avatar user={owner} size="sm" />
                  <span className="text-[13px] text-[var(--text-muted)]">{owner.name}</span>
                </div>
              )}
              {relatedGoals.map(goal => goal && (
                <Badge key={goal.id} variant="muted">
                  ↗ {goal.title}
                </Badge>
              ))}
              {space.mode === 'engineering' && (
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-faint)]">
                  <Code2 size={12} />
                  <span>Git integration active</span>
                </div>
              )}
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-4">
            {addingTask ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTask()
                    if (e.key === 'Escape') { setNewTaskTitle(''); setAddingTask(false) }
                  }}
                  onBlur={handleAddTask}
                  placeholder="Task title… (↵ to add, Esc to cancel)"
                  className="flex-1 text-[13px] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-1.5 outline-none placeholder:text-[var(--text-faint)] text-[var(--text)] focus:ring-2 focus:ring-[#5B57E0] transition-all"
                />
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAddingTask(true)}>
                <Plus size={14} />
                Add task
              </Button>
            )}

            {STATUS_ORDER.map(status => {
              const group = tasksByStatus[status]
              if (!group || group.length === 0) return null

              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[12px] font-medium text-[var(--text-muted)]">
                      {STATUS_LABELS[status]}
                    </h3>
                    <span className="mono text-[11px] text-[var(--text-faint)]">{group.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {group.map(task => (
                      <div key={task.id}>
                        <TaskRow task={task} onClick={onSelectTask} />
                        {space.mode === 'engineering' && task.gitLinks && task.gitLinks.length > 0 && (
                          <div className="flex items-center gap-1.5 pl-[52px] pb-1">
                            {task.gitLinks.map(link => (
                              <GitBadge key={link.id} link={link} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {effectiveTasks.length === 0 && (
              <p className="text-[13px] text-[var(--text-faint)] py-4">No tasks yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div
        className="relative hidden md:flex flex-col border-l border-[var(--border)] overflow-hidden"
        style={{ width: railWidth, minWidth: RAIL_MIN }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleRailResizeMouseDown}
          className="absolute left-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--accent)]/20 transition-colors duration-150 z-10"
        />
        {/* Docs section (collapsible) */}
        <div className="border-b border-[var(--border)]">
          <button
            onClick={() => setDocsOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
          >
            <span className="uppercase tracking-wider text-[11px]">Docs</span>
            <span className="text-[var(--text-faint)]">{docsOpen ? '−' : '+'}</span>
          </button>
          {docsOpen && (
            <div className="px-4 pb-3">
              {spaceDocs.length === 0 ? (
                <p className="text-[12px] text-[var(--text-faint)] py-1">No docs yet.</p>
              ) : (
                <div className="space-y-0.5 mb-2">
                  {spaceDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 py-1.5 cursor-pointer hover:text-[var(--text)] transition-colors duration-150"
                    >
                      <FileText size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                      <span className="flex-1 text-[13px] text-[var(--text)] truncate">{doc.title}</span>
                      <span className="mono text-[11px] text-[var(--text-faint)]">{doc.updatedAt}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="text-[12px] text-[var(--accent)] hover:underline transition-colors duration-150">
                + New doc
              </button>
            </div>
          )}
        </div>

        {/* Thread section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Thread</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ThreadFeed
              posts={threadPostsData}
              onSend={handleSendPost}
              compact
            />
          </div>
        </div>
      </div>

      {/* Post update modal */}
      {showPostModal && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowPostModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h3 className="text-[15px] font-medium text-[var(--text)]">Post update — {space.name}</h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Health</p>
                  <div className="flex gap-2">
                    {(['on_track', 'at_risk', 'off_track'] as const).map(h => (
                      <button
                        key={h}
                        onClick={() => setPostHealth(h)}
                        className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium border transition-all duration-150 ${postHealth === h ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'}`}
                      >
                        <HealthDot health={h} variant="pill" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Body</p>
                  <textarea
                    autoFocus
                    value={postBody}
                    onChange={e => setPostBody(e.target.value)}
                    rows={4}
                    placeholder="What's the status?"
                    className="w-full text-[13px] text-[var(--text)] bg-transparent resize-none border border-[var(--border)] rounded-[6px] p-3 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowPostModal(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handlePostUpdate}>Post</Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
