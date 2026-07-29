import { describe, it, expect } from 'vitest'
import { buildTeamSummary } from './teamMetrics'
import type { Task, TaskStatus, User } from '../types'

let seq = 0
const user = (id: string): User => ({ id, name: id, initials: id.slice(0, 2).toUpperCase(), color: '#000' })

const shared = (status: TaskStatus, spaceId: string, assigneeId?: string): Task => ({
  id: `t${seq++}`, title: 't', status, spaceId, assigneeId, isPersonal: false,
})
const personal = (status: TaskStatus): Task => ({
  id: `t${seq++}`, title: 't', status, isPersonal: true,
})

const users = [user('u1'), user('u2')]
const findP = (s: ReturnType<typeof buildTeamSummary>, id: string | null) =>
  s.people.find(p => p.userId === id)!

describe('buildTeamSummary', () => {
  it('counts active shared tasks by status per assignee', () => {
    const s = buildTeamSummary([
      shared('in_progress', 'sp1', 'u1'),
      shared('todo', 'sp1', 'u1'),
      shared('backlog', 'sp2', 'u2'),
    ], users)
    const u1 = findP(s, 'u1')
    expect(u1.active.in_progress).toBe(1)
    expect(u1.active.todo).toBe(1)
    expect(u1.activeTotal).toBe(2)
    expect(findP(s, 'u2').activeTotal).toBe(1)
  })

  it('counts done tasks as completed, not active', () => {
    const s = buildTeamSummary([
      shared('done', 'sp1', 'u1'),
      shared('done', 'sp1', 'u1'),
      shared('in_progress', 'sp1', 'u1'),
    ], users)
    const u1 = findP(s, 'u1')
    expect(u1.completed).toBe(2)
    expect(u1.activeTotal).toBe(1)
  })

  it('excludes personal tasks entirely (privacy symmetry)', () => {
    const s = buildTeamSummary([
      personal('in_progress'),
      personal('done'),
      shared('todo', 'sp1', 'u1'),
    ], users)
    expect(findP(s, 'u1').activeTotal).toBe(1)
    expect(findP(s, 'u2').activeTotal).toBe(0)
    // No personal task ever creates an Unassigned bucket.
    expect(s.people.find(p => p.userId === null)).toBeUndefined()
  })

  it('excludes canceled tasks from all counts', () => {
    const s = buildTeamSummary([
      shared('canceled', 'sp1', 'u1'),
      shared('todo', 'sp1', 'u1'),
    ], users)
    const u1 = findP(s, 'u1')
    expect(u1.activeTotal).toBe(1)
    expect(u1.completed).toBe(0)
  })

  it('buckets unassigned shared tasks under userId=null', () => {
    const s = buildTeamSummary([
      shared('in_progress', 'sp1'),      // no assignee
      shared('done', 'sp1'),
    ], users)
    const un = findP(s, null)
    expect(un.activeTotal).toBe(1)
    expect(un.completed).toBe(1)
  })

  it('keeps a row for every user, even with zero tasks', () => {
    const s = buildTeamSummary([shared('todo', 'sp1', 'u1')], users)
    expect(s.people).toHaveLength(2)
    expect(findP(s, 'u2').activeTotal).toBe(0)
  })

  it('builds one weighted edge per user/space over active assigned tasks only', () => {
    const s = buildTeamSummary([
      shared('in_progress', 'sp1', 'u1'),
      shared('todo', 'sp1', 'u1'),        // same edge → weight 2
      shared('backlog', 'sp2', 'u1'),     // different space
      shared('done', 'sp1', 'u1'),        // done → no edge
      shared('todo', 'sp1'),              // unassigned → no edge
    ], users)
    const e1 = s.edges.find(e => e.userId === 'u1' && e.spaceId === 'sp1')!
    expect(e1.weight).toBe(2)
    expect(s.edges.find(e => e.userId === 'u1' && e.spaceId === 'sp2')!.weight).toBe(1)
    expect(s.edges).toHaveLength(2)
  })

  it('reports maxActive across people (min 1)', () => {
    expect(buildTeamSummary([], users).maxActive).toBe(1)
    const s = buildTeamSummary([
      shared('todo', 'sp1', 'u1'),
      shared('todo', 'sp1', 'u1'),
      shared('todo', 'sp1', 'u2'),
    ], users)
    expect(s.maxActive).toBe(2)
  })
})
