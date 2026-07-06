import { get, post, patch, postForm, ASSET_BASE } from './client'
import type { User, Goal, Space, Task, Document, InboxItem, Meeting, ThreadPost, GitLink, Health } from '../types'

// ─── Raw API shapes (post-camelCase transform, pre-mapping) ──────────────────

interface RawUser   { id: string; name: string; email: string; isAdmin: boolean; createdAt: string }
interface RawKR     { id: string; title: string; targetValue?: number; currentValue?: number; unit?: string }
interface RawGoal   { id: string; title: string; status?: string; targetDate?: string; keyResults: RawKR[]; createdBy?: string; createdAt: string; archivedAt?: string }
interface RawSpace  { id: string; name: string; mode: string; ownerId?: string; memberIds: string[]; goalIds: string[]; updateCadence?: string; createdAt: string; archivedAt?: string }
interface RawGitLink { refType: string; url: string; externalId?: string; state?: string }
interface RawComment { id: string; authorId: string; body: string; parentCommentId?: string; createdAt: string; editedAt?: string | null }
interface RawTask   { id: string; key?: string; spaceId?: string; title: string; status: string; description?: string; assigneeId?: string; priority?: string; dueDate?: string; tagSpaceId?: string; gitLinks: RawGitLink[]; comments: RawComment[]; createdBy?: string; createdAt: string; updatedAt: string; completedAt?: string }
interface RawAttachment { kind: string; storageKey: string; filename?: string }
interface RawDoc    { id: string; title: string; ownerId: string; spaceId?: string; docType?: string; content: string; url?: string; attachments?: RawAttachment[]; linkedTaskIds: string[]; createdAt: string; updatedAt: string; archivedAt?: string }
interface RawPost   { id: string; spaceId: string | null; authorId: string; kind: string; body: string; health?: string; parentPostId?: string; periodLabel?: string; createdAt: string }
interface RawInbox  { id: string; userId: string; type: string; taskId?: string; documentId?: string; postId?: string; readAt?: string; createdAt: string }
interface RawMeetingAI { id: string; text: string; done: boolean; taskId?: string }
interface RawMeeting   { id: string; title: string; scheduledAt: string; attendeeIds: string[]; outcomes?: string; actionItems: RawMeetingAI[]; relatedSpaceIds: string[]; relatedGoalIds: string[]; createdBy?: string; createdAt: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const USER_COLORS = ['#7C3AED', '#2563EB', '#059669', '#EA580C', '#DB2777', '#0D9488']

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function getDueGroup(dueDate?: string): Task['dueGroup'] {
  if (!dueDate) return undefined
  const due  = new Date(dueDate + 'T00:00:00')
  const now  = new Date(); now.setHours(0, 0, 0, 0)
  const week = new Date(now); week.setDate(now.getDate() + 7)
  if (due <= now)  return 'today'
  if (due <= week) return 'this_week'
  return 'later'
}

// ─── Type mappers ─────────────────────────────────────────────────────────────

export function mapUser(u: RawUser, idx: number): User {
  const parts = u.name.trim().split(/\s+/)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : u.name.slice(0, 2).toUpperCase()
  return { id: u.id, name: u.name, initials, color: USER_COLORS[idx % USER_COLORS.length] }
}

export function mapGoal(g: RawGoal, allSpaces: RawSpace[]): Goal {
  return {
    id: g.id,
    title: g.title,
    status: g.status as Goal['status'],
    keyResults: (g.keyResults ?? []).map(kr => ({
      id: kr.id, title: kr.title,
      current: kr.currentValue ?? 0,
      target:  kr.targetValue  ?? 0,
      unit:    kr.unit ?? '',
    })),
    spaceIds: allSpaces.filter(s => s.goalIds.includes(g.id)).map(s => s.id),
  }
}

export function mapPost(p: RawPost): ThreadPost {
  return {
    id: p.id, spaceId: p.spaceId, authorId: p.authorId, kind: p.kind as ThreadPost['kind'],
    body: p.body, health: p.health as Health | undefined,
    parentPostId: p.parentPostId, periodLabel: p.periodLabel,
    createdAt: formatRelative(p.createdAt),
  }
}

export function mapSpace(s: RawSpace, allPosts: RawPost[]): Space {
  const latest = allPosts
    .filter(p => p.spaceId === s.id && p.kind === 'status')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return {
    id: s.id, name: s.name, mode: s.mode as Space['mode'],
    ownerId: s.ownerId, goalIds: s.goalIds,
    latestStatusPost: latest ? mapPost(latest) : undefined,
  }
}

export function mapTask(t: RawTask): Task {
  return {
    id: t.id, key: t.key ?? undefined, title: t.title,
    status: t.status as Task['status'], priority: t.priority as Task['priority'],
    assigneeId: t.assigneeId ?? undefined, spaceId: t.spaceId ?? undefined,
    tagSpaceId: t.tagSpaceId ?? undefined,
    isPersonal: !t.spaceId, dueGroup: getDueGroup(t.dueDate),
    gitLinks: (t.gitLinks ?? []).map((gl, i): GitLink => ({
      id:         `${t.id}-gl-${i}`,
      refType:    gl.refType as GitLink['refType'],
      state:      (gl.state ?? 'open') as GitLink['state'],
      label:      gl.externalId ? `#${gl.externalId}` : gl.url,
      url:        gl.url,
      externalId: gl.externalId,
    })),
  }
}

export function mapDocument(d: RawDoc): Document {
  const att = (d.attachments ?? []).find(a => a.kind === 'pdf' || a.kind === 'image')
  return {
    id: d.id, title: d.title, ownerId: d.ownerId,
    spaceId: d.spaceId ?? undefined,
    docType: d.docType as Document['docType'],
    updatedAt: formatRelative(d.updatedAt),
    content: d.content,
    url: d.url ?? undefined,
    fileKind: att ? (att.kind as 'pdf' | 'image') : undefined,
    fileUrl: att ? `${ASSET_BASE}/uploads/${att.storageKey}` : undefined,
  }
}

export function mapInboxItem(
  item: RawInbox,
  tasksById: Record<string, Task>,
  docsById: Record<string, { title: string }>,
): InboxItem {
  let text = '', sourceLabel = '', sourceId = ''
  const task = item.taskId ? tasksById[item.taskId] : undefined
  const doc  = item.documentId ? docsById[item.documentId] : undefined

  switch (item.type) {
    case 'mention':
      text        = `Someone mentioned you in ${doc?.title ?? 'a document'}`
      sourceLabel = doc?.title ?? ''
      sourceId    = item.documentId ?? ''
      break
    case 'assignment':
      text        = `You were assigned ${task?.title ?? 'a task'}`
      sourceLabel = task?.key ?? task?.title ?? ''
      sourceId    = item.taskId ?? ''
      break
    case 'review_request':
      text        = `Review requested on ${task?.key ? `PR · ${task.key}` : task?.title ?? 'a task'}`
      sourceLabel = task?.key ?? task?.title ?? ''
      sourceId    = item.taskId ?? ''
      break
    default:
      text        = `Someone replied to your comment in ${doc?.title ?? 'a document'}`
      sourceLabel = doc?.title ?? ''
      sourceId    = item.documentId ?? item.taskId ?? ''
  }

  return {
    id: item.id, type: item.type as InboxItem['type'],
    text, sourceLabel, sourceId,
    createdAt: formatRelative(item.createdAt),
    read: item.readAt !== null && item.readAt !== undefined,
  }
}

export function mapMeeting(m: RawMeeting): Meeting {
  return {
    id: m.id, title: m.title, scheduledAt: m.scheduledAt,
    attendeeIds: m.attendeeIds, outcomes: m.outcomes,
    actionItems: m.actionItems.map(ai => ({ id: ai.id, text: ai.text, done: ai.done, taskId: ai.taskId })),
    relatedSpaceIds: m.relatedSpaceIds,
  }
}

export function mapComment(c: RawComment): import('../types').Comment {
  return { id: c.id, authorId: c.authorId, body: c.body, createdAt: formatRelative(c.createdAt) }
}

// ─── API functions ────────────────────────────────────────────────────────────

export const getUsers       = () => get<RawUser[]>('/users')
export const getGoals       = () => get<RawGoal[]>('/goals')
export const getSpaces      = () => get<RawSpace[]>('/spaces')
export const getAllPosts     = () => get<RawPost[]>('/thread-posts?all=true')
export const getPostsBySpace = (spaceId: string | null) =>
  spaceId === null
    ? get<RawPost[]>('/thread-posts')
    : get<RawPost[]>(`/thread-posts?space_id=${spaceId}`)
export const getMyWork      = () => get<RawTask[]>('/tasks/my-work')
export const getTasksBySpace = (spaceId: string) => get<RawTask[]>(`/tasks?space_id=${spaceId}`)
export const getDocuments   = () => get<RawDoc[]>('/documents')
export const getDocument    = (docId: string) => get<RawDoc>(`/documents/${docId}`)

export const createDocument = (body: {
  title?: string; space_id?: string; doc_type?: string; content?: string; url?: string;
}) => post<RawDoc>('/documents', body)

export const updateDocument = (docId: string, body: {
  title?: string; content?: string; doc_type?: string; space_id?: string; url?: string;
}) => patch<RawDoc>(`/documents/${docId}`, body)

export const uploadDocument = (file: File, opts: { title?: string; space_id?: string } = {}) => {
  const form = new FormData()
  form.append('file', file)
  if (opts.title) form.append('title', opts.title)
  if (opts.space_id) form.append('space_id', opts.space_id)
  return postForm<RawDoc>('/documents/upload', form)
}
export const getInbox       = () => get<RawInbox[]>('/inbox')
export const getMeetings    = () => get<RawMeeting[]>('/meetings')

// Mutations — tasks
export const createTask = (body: {
  title: string; space_id?: string; status?: string; assignee_id?: string; priority?: string;
  due_date?: string;
}) => post<RawTask>('/tasks', body)

export const getTask = (taskId: string) => get<RawTask>(`/tasks/${taskId}`)

export const updateTask = (taskId: string, body: {
  title?: string; status?: string; priority?: string; assignee_id?: string | null;
  description?: string; due_date?: string | null; space_id?: string | null;
}) => patch<RawTask>(`/tasks/${taskId}`, body)

export const addTaskComment = (taskId: string, body: { body: string }) =>
  post<RawComment>(`/tasks/${taskId}/comments`, body)

// Git links — add a branch/PR/commit link, and simulate provider webhook state
// changes that auto-advance task status (§6 rule 12).
export const addGitLink = (taskId: string, body: {
  ref_type: string; url: string; external_id?: string; state?: string;
}) => post<RawGitLink>(`/tasks/${taskId}/git-links`, body)

export const updateGitLinkState = (taskId: string, externalId: string, state: string) =>
  patch<RawTask>(`/tasks/${taskId}/git-links/${externalId}/state`, { state })

// Mutations — meetings
export const createMeeting = (body: {
  title: string; scheduled_at: string; attendee_ids?: string[];
  outcomes?: string; action_items?: { text: string }[];
  related_space_ids?: string[]; related_goal_ids?: string[];
}) => post<RawMeeting>('/meetings', body)

export const updateMeeting = (meetingId: string, body: {
  title?: string; outcomes?: string; attendee_ids?: string[];
}) => patch<RawMeeting>(`/meetings/${meetingId}`, body)

export const patchMeetingActionItem = (meetingId: string, aiId: string, body: { done?: boolean; text?: string }) =>
  patch<RawMeetingAI>(`/meetings/${meetingId}/action-items/${aiId}`, body)

export const convertActionItem = (meetingId: string, aiId: string) =>
  post<RawMeetingAI>(`/meetings/${meetingId}/action-items/${aiId}/convert`)

export const addMeetingActionItem = (meetingId: string, body: { text: string }) =>
  post<RawMeetingAI>(`/meetings/${meetingId}/action-items`, body)

// Mutations — posts / inbox
export const createPost = (body: { space_id: string | null; kind: string; body: string; health?: string }) =>
  post<RawPost>('/thread-posts', body)

export const markInboxRead    = (id: string)  => post<RawInbox>(`/inbox/${id}/read`)
export const markAllInboxRead = ()            => post<void>('/inbox/read-all')
