import type { Task, TaskStatus, User } from '../types'

// The Team view answers "who owns what, and how much." It counts SHARED tasks
// only: `GET /tasks` returns every shared task but only the caller's own personal
// tasks (§6 privacy), so counting personal tasks would inflate the current user
// asymmetrically and risk implying private work. Personal tasks are excluded
// entirely, and `canceled` tasks are excluded from every count.

/** Active statuses that contribute to a person's current workload, in display order. */
export const ACTIVE_STATUSES = ['in_progress', 'in_review', 'todo', 'backlog'] as const
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number]

export type StatusCounts = Record<ActiveStatus, number>

export interface PersonSummary {
  /** null = the "Unassigned" bucket (shared tasks with no assignee). */
  userId: string | null
  active: StatusCounts
  activeTotal: number
  completed: number
}

/** One person's assignment weight into one space (active tasks only) — graph edge. */
export interface SpaceEdge {
  userId: string
  spaceId: string
  weight: number
}

export interface TeamSummary {
  people: PersonSummary[]
  edges: SpaceEdge[]
  /** Largest activeTotal across people — used to normalize workload bars. Min 1. */
  maxActive: number
}

const UNASSIGNED = '__unassigned__'

function emptyCounts(): StatusCounts {
  return { in_progress: 0, in_review: 0, todo: 0, backlog: 0 }
}

function isActive(status: TaskStatus): status is ActiveStatus {
  return (ACTIVE_STATUSES as readonly string[]).includes(status)
}

/**
 * Aggregate shared tasks into per-person workload + completion counts and the
 * people↔space assignment edges for the graph lens.
 *
 * Every user in `users` gets a row (even with zero tasks — absence of ownership
 * is itself signal). An "Unassigned" row (userId=null) is appended only when
 * shared tasks exist with no assignee.
 */
export function buildTeamSummary(tasks: Task[], users: User[]): TeamSummary {
  const active: Record<string, StatusCounts> = {}
  const completed: Record<string, number> = {}
  const edges: Record<string, SpaceEdge> = {}

  const bump = (key: string) => (active[key] ??= emptyCounts())

  for (const user of users) {
    bump(user.id)
    completed[user.id] = 0
  }

  for (const t of tasks) {
    // Shared tasks only; skip personal and canceled.
    if (t.isPersonal || !t.spaceId) continue
    if (t.status === 'canceled') continue

    const key = t.assigneeId ?? UNASSIGNED

    if (t.status === 'done') {
      completed[key] = (completed[key] ?? 0) + 1
      continue
    }

    if (isActive(t.status)) {
      bump(key)[t.status] += 1
      // Only attributable (assigned) work becomes a graph edge.
      if (t.assigneeId) {
        const edgeKey = `${t.assigneeId}:${t.spaceId}`
        const edge = (edges[edgeKey] ??= { userId: t.assigneeId, spaceId: t.spaceId, weight: 0 })
        edge.weight += 1
      }
    }
  }

  const total = (c: StatusCounts) => c.in_progress + c.in_review + c.todo + c.backlog

  const people: PersonSummary[] = users.map(u => ({
    userId: u.id,
    active: active[u.id],
    activeTotal: total(active[u.id]),
    completed: completed[u.id] ?? 0,
  }))

  // Append the Unassigned bucket only if it carries anything.
  const unassignedActive = active[UNASSIGNED]
  const unassignedDone = completed[UNASSIGNED] ?? 0
  if (unassignedActive || unassignedDone) {
    const counts = unassignedActive ?? emptyCounts()
    people.push({
      userId: null,
      active: counts,
      activeTotal: total(counts),
      completed: unassignedDone,
    })
  }

  const maxActive = Math.max(1, ...people.map(p => p.activeTotal))

  return { people, edges: Object.values(edges), maxActive }
}
