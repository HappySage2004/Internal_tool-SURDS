import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  AtSign, UserPlus, GitPullRequest, MessageSquare,
  ChevronDown, ChevronRight, FileText, Image as ImageIcon, Lock, Inbox,
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import type { Task, InboxItemType, Document } from '../../types'
import { TaskRow } from '../ui/TaskRow'
import { Badge } from '../ui/Badge'
import { DocumentViewer } from '../panels/DocumentViewer'
import { getLinkProvider } from '../../lib/linkProvider'
import * as api from '../../api'

interface MyWorkProps {
  onSelectTask: (taskId: string) => void
  onNewTask: () => void
}

const InboxIcon = ({ type }: { type: InboxItemType }) => {
  const size = 15
  if (type === 'mention')        return <AtSign size={size} className="text-[var(--accent)]" />
  if (type === 'assignment')     return <UserPlus size={size} className="text-[#2F6FED]" />
  if (type === 'review_request') return <GitPullRequest size={size} className="text-[#C77700]" />
  return <MessageSquare size={size} className="text-[var(--text-muted)]" />
}

function groupTasks(taskList: Task[]) {
  const today: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []
  const noDate: Task[] = []

  for (const t of taskList) {
    if (t.dueGroup === 'today')     today.push(t)
    else if (t.dueGroup === 'this_week') thisWeek.push(t)
    else if (t.dueGroup === 'later') later.push(t)
    else noDate.push(t)
  }
  return { today, thisWeek, later, noDate }
}

interface TaskGroupProps {
  label: string
  taskList: Task[]
  onSelectTask: (id: string) => void
  parentTitles: Record<string, string>
}

function TaskGroup({ label, taskList, onSelectTask, parentTitles }: TaskGroupProps) {
  const [open, setOpen] = useState(true)
  if (taskList.length === 0) return null

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150 w-full"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{label}</span>
        <span className="mono text-[11px] text-[var(--text-faint)] ml-1">{taskList.length}</span>
      </button>
      {open && (
        <div>
          {taskList.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              onClick={onSelectTask}
              showSpace
              parentLabel={t.parentTaskId ? parentTitles[t.parentTaskId] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MyWork({ onSelectTask, onNewTask }: MyWorkProps) {
  const { tasks, tasksById, inboxItems, documents, spacesById, markRead } = useData()
  const { userId } = useAuth()
  const myTasks = tasks.filter(t => t.assigneeId === userId || t.isPersonal)
  const myDocs  = documents.filter(d => d.ownerId === userId)
  const [inboxOpen, setInboxOpen] = useState(true)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const unread  = inboxItems.filter(i => !i.read)
  const grouped = groupTasks(myTasks)

  // Resolve parent titles for any sub-tasks in My work (a sub-task's parent may
  // not itself be in this list), so each sub-task row shows a breadcrumb.
  const [fetchedParents, setFetchedParents] = useState<Record<string, string>>({})
  const parentTitles: Record<string, string> = { ...fetchedParents }
  for (const t of myTasks) {
    if (t.parentTaskId && tasksById[t.parentTaskId]) {
      parentTitles[t.parentTaskId] = tasksById[t.parentTaskId].title
    }
  }
  useEffect(() => {
    const missing = myTasks
      .map(t => t.parentTaskId)
      .filter((pid): pid is string => !!pid && !tasksById[pid] && !fetchedParents[pid])
    if (missing.length === 0) return
    Promise.all(Array.from(new Set(missing)).map(pid =>
      api.getTask(pid).then(p => [pid, p.title] as const).catch(() => null)
    )).then(pairs => {
      const next: Record<string, string> = {}
      for (const pair of pairs) if (pair) next[pair[0]] = pair[1]
      if (Object.keys(next).length) setFetchedParents(prev => ({ ...prev, ...next }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTasks.map(t => t.parentTaskId).join(',')])

  const handleNewTask = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      // In a real app, create task. For demo, clear + open QuickCreate
      setNewTaskTitle('')
      onNewTask()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        {/* Page title */}
        <h1 className="text-[21px] font-medium text-[var(--text)] mb-6">My work</h1>

        {/* ── Inbox ──────────────────────────────────────────────────── */}
        <section className="mb-8">
          <button
            onClick={() => setInboxOpen(v => !v)}
            className="flex items-center gap-2 mb-2 group"
          >
            <Inbox size={15} className="text-[var(--text-muted)]" />
            <span className="text-[15px] font-medium text-[var(--text)]">Inbox</span>
            {unread.length > 0 && (
              <span className="mono text-[11px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full font-medium">
                {unread.length}
              </span>
            )}
            <span className="ml-1 text-[var(--text-faint)]">
              {inboxOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>

          {inboxOpen && (
            <div className="space-y-0.5">
              {inboxItems.length === 0 ? (
                <p className="text-[13px] text-[var(--text-faint)] px-3 py-2">
                  You&apos;re all caught up
                </p>
              ) : (
                inboxItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { if (!item.read) markRead(item.id) }}
                    className={`
                      flex items-start gap-3 px-3 py-2.5 rounded-[6px] cursor-pointer
                      transition-all duration-150 hover:bg-[var(--surface)]
                      ${!item.read ? 'bg-[var(--accent-soft)]/40' : ''}
                    `}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      <InboxIcon type={item.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] leading-snug ${!item.read ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                        {item.text}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="mono text-[11px] text-[var(--text-faint)]">{item.createdAt}</span>
                        <span className="text-[11px] text-[var(--accent)]">{item.sourceLabel}</span>
                      </div>
                    </div>
                    {!item.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── My tasks ───────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-[15px] font-medium text-[var(--text)] mb-3">My tasks</h2>

          {/* Add task input */}
          <div className="flex items-center gap-2 px-3 py-2 mb-3 border border-dashed border-[var(--border)] rounded-[6px] bg-[var(--surface)]">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-faint)] flex-shrink-0" />
            <input
              ref={inputRef}
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={handleNewTask}
              placeholder="Add a task... personal by default"
              className="flex-1 text-[13px] bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-faint)]"
            />
            <Lock size={12} className="text-[var(--text-faint)] flex-shrink-0" />
          </div>

          <TaskGroup label="Today"     taskList={grouped.today}    onSelectTask={onSelectTask} parentTitles={parentTitles} />
          <TaskGroup label="This week" taskList={grouped.thisWeek} onSelectTask={onSelectTask} parentTitles={parentTitles} />
          <TaskGroup label="Later"     taskList={grouped.later}    onSelectTask={onSelectTask} parentTitles={parentTitles} />
          <TaskGroup label="No date"   taskList={grouped.noDate}   onSelectTask={onSelectTask} parentTitles={parentTitles} />
        </section>

        {/* ── Recent docs ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-[15px] font-medium text-[var(--text)] mb-3">Recent docs</h2>
          <div className="space-y-0.5">
            {myDocs.map(doc => {
              const space = doc.spaceId ? spacesById[doc.spaceId] : undefined
              const provider = doc.url ? getLinkProvider(doc.url) : undefined
              const Icon = provider?.icon ?? (doc.fileKind === 'image' ? ImageIcon : FileText)
              const rowClass = `
                flex items-center gap-3 px-3 py-2.5 rounded-[6px] cursor-pointer
                hover:bg-[var(--surface)] transition-all duration-150
              `
              const inner = (
                <>
                  <Icon
                    size={15}
                    className={provider ? 'flex-shrink-0' : 'text-[var(--text-muted)] flex-shrink-0'}
                    style={provider ? { color: provider.color } : undefined}
                  />
                  <span className="flex-1 text-[13px] text-[var(--text)] truncate">{doc.title}</span>
                  {space ? (
                    <Badge variant="default">{space.name}</Badge>
                  ) : (
                    <Badge variant="muted">
                      <Lock size={10} />
                      personal
                    </Badge>
                  )}
                  <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{doc.updatedAt}</span>
                </>
              )
              return doc.url ? (
                <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer noopener" className={rowClass}>
                  {inner}
                </a>
              ) : (
                <button
                  key={doc.id}
                  onClick={() => setViewerDoc(doc)}
                  className={`${rowClass} w-full text-left`}
                >
                  {inner}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {viewerDoc && (
        <DocumentViewer
          doc={viewerDoc}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  )
}
