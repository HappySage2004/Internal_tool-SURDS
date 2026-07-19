export type SpaceMode = 'engineering' | 'workstream'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'achieved'
export type Health = 'on_track' | 'at_risk' | 'off_track'
export type GitRefType = 'branch' | 'pull_request' | 'commit'
export type GitRefState = 'open' | 'merged' | 'closed'
export type InboxItemType = 'mention' | 'assignment' | 'review_request' | 'comment_reply'
export type ThreadPostKind = 'message' | 'status'
export type DocType = 'note' | 'spec' | 'decision_log'

export interface User {
  id: string
  name: string
  initials: string
  color: string
}

export interface KeyResult {
  id: string
  title: string
  current: number
  target: number
  unit: string
}

export interface Goal {
  id: string
  title: string
  status?: GoalStatus
  keyResults: KeyResult[]
  spaceIds: string[]
}

export interface GitLink {
  id: string
  refType: GitRefType
  state: GitRefState
  label: string
  url: string
  externalId?: string   // PR number / commit sha — keys the state-update webhook
}

export interface Task {
  id: string
  key?: string
  title: string
  status: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  dueGroup?: 'today' | 'this_week' | 'later'
  spaceId?: string
  tagSpaceId?: string
  isPersonal: boolean
  gitLinks?: GitLink[]
}

export interface ThreadPost {
  id: string
  spaceId: string | null   // null = General thread
  authorId: string
  kind: ThreadPostKind
  body: string
  health?: Health          // only on kind='status'
  parentPostId?: string
  periodLabel?: string
  createdAt: string
}

// Keep SpaceUpdate as alias so existing imports don't break
export type SpaceUpdate = ThreadPost

export interface Space {
  id: string
  name: string
  mode: SpaceMode
  ownerId?: string
  goalIds: string[]
  latestStatusPost?: ThreadPost
}

export interface Document {
  id: string
  title: string
  ownerId: string
  spaceId?: string
  updatedAt: string
  docType?: DocType
  /** Markdown body. Undefined until the doc is opened (list responses carry it,
   *  but it may be lazily fetched for a single doc). Empty for link bookmarks. */
  content?: string
  /** External link (Google Sheets/Docs, Figma, Notion, …). When set, this
   *  Document is a bookmark — only the URL is stored, no bytes. */
  url?: string
  /** Set when the doc is an uploaded file rather than a markdown body. */
  fileKind?: 'pdf' | 'image'
  /** Served URL for the uploaded file (backend /uploads/<key>). */
  fileUrl?: string
}

export interface ActionItem {
  id: string
  text: string
  done: boolean
  taskId?: string
}

export interface Meeting {
  id: string
  title: string
  scheduledAt: string      // ISO-8601 or display string
  attendeeIds: string[]
  outcomes?: string        // markdown
  actionItems: ActionItem[]
  relatedSpaceIds?: string[]
}

export interface InboxItem {
  id: string
  type: InboxItemType
  text: string
  sourceLabel: string
  sourceId: string
  createdAt: string
  read: boolean
}

export interface Comment {
  id: string
  authorId: string
  body: string
  createdAt: string
}
