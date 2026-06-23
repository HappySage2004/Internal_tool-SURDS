import type { User, Goal, Space, ThreadPost, Task, Document, InboxItem, Meeting } from '../types'

// ─── Users ───────────────────────────────────────────────────────────────────
export const users: User[] = [
  { id: 'aaryan', name: 'Aaryan', initials: 'AA', color: '#7C3AED' },
  { id: 'mara',   name: 'Mara',   initials: 'MA', color: '#2563EB' },
  { id: 'devon',  name: 'Devon',  initials: 'DE', color: '#059669' },
  { id: 'priya',  name: 'Priya',  initials: 'PR', color: '#EA580C' },
  { id: 'sam',    name: 'Sam',    initials: 'SA', color: '#DB2777' },
  { id: 'lena',   name: 'Lena',   initials: 'LE', color: '#0D9488' },
]

export const usersById: Record<string, User> = Object.fromEntries(users.map(u => [u.id, u]))

// ─── Thread posts ─────────────────────────────────────────────────────────────
export const threadPosts: ThreadPost[] = [
  // Auth thread
  { id: 'post-auth-1', spaceId: 'auth', authorId: 'devon', kind: 'message', body: 'Heads up — rotating the signing keys Thursday, expect a brief blip.', createdAt: '6h ago' },
  { id: 'post-auth-2', spaceId: 'auth', authorId: 'mara', kind: 'message', body: "Noted, I'll hold the SSO merge until after.", createdAt: '5h ago' },
  { id: 'post-auth-3', spaceId: 'auth', authorId: 'mara', kind: 'status', body: 'SSO in review, on track to merge this week.', health: 'on_track', createdAt: '5h ago' },

  // Payments thread
  { id: 'post-pay-1', spaceId: 'payments', authorId: 'devon', kind: 'status', body: 'Checkout shipped; unblocks two enterprise trials.', health: 'on_track', createdAt: '3h ago' },

  // Infra thread
  { id: 'post-infra-1', spaceId: 'infra', authorId: 'mara', kind: 'status', body: 'Migration blocked on vendor; escalated.', health: 'at_risk', createdAt: '2d ago' },

  // Sales thread
  { id: 'post-sales-1', spaceId: 'sales', authorId: 'sam', kind: 'status', body: 'Two deals slipped to next month; rest of pipeline healthy.', health: 'at_risk', createdAt: '1d ago' },

  // Finance thread
  { id: 'post-fin-1', spaceId: 'finance', authorId: 'lena', kind: 'status', body: 'Burn above target; cost cuts proposed for review.', health: 'off_track', createdAt: '1d ago' },

  // Ops thread
  { id: 'post-ops-1', spaceId: 'ops', authorId: 'priya', kind: 'status', body: 'Hiring pipeline for Q3 roles is on track.', health: 'on_track', createdAt: '4d ago' },

  // General thread (spaceId: null)
  { id: 'post-gen-1', spaceId: null, authorId: 'aaryan', kind: 'message', body: "Board meeting Friday — I'll share the deck Thursday for feedback.", createdAt: '2d ago' },
  { id: 'post-gen-2', spaceId: null, authorId: 'priya', kind: 'message', body: 'New laptops arrive next week; reply with your size preference.', createdAt: '1d ago' },
  { id: 'post-gen-3', spaceId: null, authorId: 'sam', kind: 'message', body: 'Closed the Northwind deal — biggest logo yet.', createdAt: '4h ago' },
]

export const threadPostsBySpaceId = (spaceId: string | null) =>
  threadPosts.filter(p => p.spaceId === spaceId)

// Keep spaceUpdates export for backward compat (Goals.tsx, SpaceDetail.tsx)
export const spaceUpdates = threadPosts.filter(p => p.kind === 'status' && p.spaceId !== null)

const latestStatusBySpaceId = Object.fromEntries(
  threadPosts
    .filter(p => p.kind === 'status' && p.spaceId !== null)
    .map(p => [p.spaceId, p])
)

// ─── Spaces ───────────────────────────────────────────────────────────────────
export const spaces: Space[] = [
  {
    id: 'auth',
    name: 'Auth',
    mode: 'engineering',
    ownerId: 'mara',
    goalIds: ['ship-v2'],
    latestStatusPost: latestStatusBySpaceId['auth'],
    get latestUpdate() { return this.latestStatusPost },
  },
  {
    id: 'payments',
    name: 'Payments',
    mode: 'engineering',
    ownerId: 'devon',
    goalIds: ['arr', 'ship-v2'],
    latestStatusPost: latestStatusBySpaceId['payments'],
    get latestUpdate() { return this.latestStatusPost },
  },
  {
    id: 'infra',
    name: 'Infra',
    mode: 'engineering',
    ownerId: 'mara',
    goalIds: ['ship-v2'],
    latestStatusPost: latestStatusBySpaceId['infra'],
    get latestUpdate() { return this.latestStatusPost },
  },
  {
    id: 'sales',
    name: 'Sales',
    mode: 'workstream',
    ownerId: 'sam',
    goalIds: ['arr'],
    latestStatusPost: latestStatusBySpaceId['sales'],
    get latestUpdate() { return this.latestStatusPost },
  },
  {
    id: 'finance',
    name: 'Finance',
    mode: 'workstream',
    ownerId: 'lena',
    goalIds: ['runway'],
    latestStatusPost: latestStatusBySpaceId['finance'],
    get latestUpdate() { return this.latestStatusPost },
  },
  {
    id: 'ops',
    name: 'Ops',
    mode: 'workstream',
    ownerId: 'priya',
    goalIds: ['runway'],
    latestStatusPost: latestStatusBySpaceId['ops'],
    get latestUpdate() { return this.latestStatusPost },
  },
]

export const spacesById: Record<string, Space> = Object.fromEntries(spaces.map(s => [s.id, s]))

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goals: Goal[] = [
  {
    id: 'arr',
    title: 'Reach $1M ARR',
    status: 'at_risk',
    keyResults: [
      { id: 'kr-arr-1', title: 'Pipeline created', current: 420000, target: 600000, unit: '$' },
      { id: 'kr-arr-2', title: 'New logos', current: 6, target: 10, unit: '' },
    ],
    spaceIds: ['sales', 'payments'],
  },
  {
    id: 'ship-v2',
    title: 'Ship v2 platform',
    status: 'on_track',
    keyResults: [
      { id: 'kr-v2-1', title: 'Core modules done', current: 4, target: 6, unit: '' },
    ],
    spaceIds: ['auth', 'payments', 'infra'],
  },
  {
    id: 'runway',
    title: 'Extend runway to 18 months',
    status: 'off_track',
    keyResults: [
      { id: 'kr-runway-1', title: 'Monthly burn', current: 90000, target: 75000, unit: '$' },
    ],
    spaceIds: ['finance', 'ops'],
  },
]

export const goalsById: Record<string, Goal> = Object.fromEntries(goals.map(g => [g.id, g]))

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks: Task[] = [
  // Aaryan's tasks
  {
    id: 'task-auth-214',
    key: 'AUTH-214',
    title: 'Fix login redirect loop',
    status: 'in_progress',
    spaceId: 'auth',
    dueGroup: 'today',
    assigneeId: 'aaryan',
    isPersonal: false,
    gitLinks: [
      { id: 'gl-1', refType: 'pull_request', state: 'open', label: '#214 · fix/login-redirect', url: '#' },
    ],
  },
  {
    id: 'task-vendor-contract',
    title: 'Review vendor contract',
    status: 'in_review',
    spaceId: 'finance',
    dueGroup: 'today',
    assigneeId: 'aaryan',
    isPersonal: false,
  },
  {
    id: 'task-q3-hiring',
    title: 'Draft Q3 hiring plan',
    status: 'todo',
    spaceId: 'ops',
    dueGroup: 'this_week',
    assigneeId: 'aaryan',
    isPersonal: false,
  },
  {
    id: 'task-pay-88',
    key: 'PAY-88',
    title: 'Write payments spec',
    status: 'todo',
    spaceId: 'payments',
    dueGroup: 'this_week',
    assigneeId: 'aaryan',
    isPersonal: false,
  },
  {
    id: 'task-board-slides',
    title: 'Prep board update slides',
    status: 'todo',
    dueGroup: 'today',
    assigneeId: 'aaryan',
    isPersonal: true,
  },
  {
    id: 'task-refund-rfc',
    title: 'Read refund-flow RFC',
    status: 'todo',
    tagSpaceId: 'payments',
    dueGroup: 'this_week',
    assigneeId: 'aaryan',
    isPersonal: true,
  },

  // Auth space full task list
  {
    id: 'task-auth-201',
    key: 'AUTH-201',
    title: 'Implement OAuth provider',
    status: 'done',
    spaceId: 'auth',
    assigneeId: 'mara',
    isPersonal: false,
    gitLinks: [
      { id: 'gl-2', refType: 'pull_request', state: 'merged', label: '#201 · feat/oauth', url: '#' },
    ],
  },
  {
    id: 'task-auth-215',
    key: 'AUTH-215',
    title: 'Add session refresh',
    status: 'todo',
    spaceId: 'auth',
    assigneeId: 'devon',
    isPersonal: false,
  },
  {
    id: 'task-auth-220',
    key: 'AUTH-220',
    title: 'SSO integration',
    status: 'in_review',
    spaceId: 'auth',
    assigneeId: 'mara',
    isPersonal: false,
    gitLinks: [
      { id: 'gl-3', refType: 'pull_request', state: 'open', label: '#220 · feat/sso', url: '#' },
    ],
  },
  {
    id: 'task-auth-225',
    key: 'AUTH-225',
    title: 'Audit token storage',
    status: 'backlog',
    spaceId: 'auth',
    isPersonal: false,
  },
  {
    id: 'task-auth-198',
    key: 'AUTH-198',
    title: 'Remove legacy auth',
    status: 'canceled',
    spaceId: 'auth',
    isPersonal: false,
  },

  // Payments tasks
  {
    id: 'task-pay-90',
    key: 'PAY-90',
    title: 'Checkout flow v2',
    status: 'done',
    spaceId: 'payments',
    assigneeId: 'devon',
    isPersonal: false,
    gitLinks: [
      { id: 'gl-4', refType: 'pull_request', state: 'merged', label: '#90 · feat/checkout-v2', url: '#' },
    ],
  },
  {
    id: 'task-pay-92',
    key: 'PAY-92',
    title: 'Refund API endpoint',
    status: 'in_progress',
    spaceId: 'payments',
    assigneeId: 'devon',
    isPersonal: false,
    gitLinks: [
      { id: 'gl-5', refType: 'branch', state: 'open', label: 'feat/refund-api', url: '#' },
    ],
  },
  {
    id: 'task-pay-95',
    key: 'PAY-95',
    title: 'Enterprise billing portal',
    status: 'todo',
    spaceId: 'payments',
    assigneeId: 'devon',
    isPersonal: false,
  },

  // Infra tasks
  {
    id: 'task-infra-10',
    key: 'INF-10',
    title: 'Database migration to Postgres 16',
    status: 'in_progress',
    spaceId: 'infra',
    assigneeId: 'mara',
    isPersonal: false,
    priority: 'high',
  },
  {
    id: 'task-infra-11',
    key: 'INF-11',
    title: 'Set up staging environment',
    status: 'todo',
    spaceId: 'infra',
    assigneeId: 'mara',
    isPersonal: false,
  },
  {
    id: 'task-infra-12',
    key: 'INF-12',
    title: 'Cost optimization audit',
    status: 'backlog',
    spaceId: 'infra',
    isPersonal: false,
    priority: 'medium',
  },
]

export const tasksById: Record<string, Task> = Object.fromEntries(tasks.map(t => [t.id, t]))

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents: Document[] = [
  { id: 'doc-pay-spec', title: 'Payments spec', ownerId: 'devon', spaceId: 'payments', docType: 'spec', updatedAt: '2h ago' },
  { id: 'doc-refund', title: 'Refund-flow RFC', ownerId: 'mara', spaceId: 'payments', docType: 'note', updatedAt: '1d ago' },
  { id: 'doc-auth-pm', title: 'Auth outage postmortem', ownerId: 'mara', spaceId: 'infra', docType: 'decision_log', updatedAt: '3d ago' },
  { id: 'doc-board', title: 'Q3 board deck', ownerId: 'aaryan', spaceId: undefined, docType: 'note', updatedAt: '1d ago' },
  { id: 'doc-2', title: 'Q3 hiring plan draft', ownerId: 'aaryan', spaceId: 'ops', docType: 'note', updatedAt: '1d ago' },
  { id: 'doc-3', title: 'Auth architecture notes', ownerId: 'aaryan', spaceId: 'auth', docType: 'note', updatedAt: '3d ago' },
]

// ─── Meetings ─────────────────────────────────────────────────────────────────
export const meetings: Meeting[] = [
  {
    id: 'mtg-1',
    title: 'Weekly eng sync',
    scheduledAt: 'Mon 10:00',
    attendeeIds: ['mara', 'devon', 'aaryan'],
    outcomes: 'Prioritized SSO; deferred the token-storage audit.',
    actionItems: [
      { id: 'ai-1', text: 'Hold SSO merge until key rotation', done: false, taskId: undefined },
    ],
    relatedSpaceIds: ['auth'],
  },
  {
    id: 'mtg-2',
    title: 'Board prep',
    scheduledAt: 'Thu 15:00',
    attendeeIds: ['aaryan', 'lena'],
    outcomes: 'Aligned on the runway narrative and the proposed cost cuts.',
    actionItems: [],
    relatedSpaceIds: [],
  },
]

export const meetingsById: Record<string, Meeting> = Object.fromEntries(meetings.map(m => [m.id, m]))

// ─── Inbox ────────────────────────────────────────────────────────────────────
export const inboxItems: InboxItem[] = [
  {
    id: 'inbox-1',
    type: 'mention',
    text: 'Mara mentioned you in Payments spec — can you confirm the refund flow?',
    sourceLabel: 'Payments spec',
    sourceId: 'doc-1',
    createdAt: '2h ago',
    read: false,
  },
  {
    id: 'inbox-2',
    type: 'assignment',
    text: 'Devon assigned you Fix login redirect loop',
    sourceLabel: 'AUTH-214',
    sourceId: 'task-auth-214',
    createdAt: '5h ago',
    read: false,
  },
  {
    id: 'inbox-3',
    type: 'review_request',
    text: 'PR #214 · vendor API client — review requested',
    sourceLabel: 'PR #214',
    sourceId: 'task-auth-214',
    createdAt: '1d ago',
    read: false,
  },
  {
    id: 'inbox-4',
    type: 'comment_reply',
    text: 'Priya replied to your comment in Q3 hiring plan draft',
    sourceLabel: 'Q3 hiring plan draft',
    sourceId: 'doc-2',
    createdAt: '2d ago',
    read: true,
  },
]
