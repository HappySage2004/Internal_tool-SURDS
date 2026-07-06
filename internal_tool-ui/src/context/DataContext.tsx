import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../api'
import type { User, Goal, Space, Task, Document, InboxItem, Meeting, ThreadPost } from '../types'
import {
  users as mockUsers, goals as mockGoals, spaces as mockSpaces,
  tasks as mockTasks, documents as mockDocuments, inboxItems as mockInbox,
  meetings as mockMeetings, threadPosts as mockPosts,
} from '../data/mock'

// ─── Context shape ────────────────────────────────────────────────────────────

interface DataState {
  // Collections
  users:        User[]
  usersById:    Record<string, User>
  goals:        Goal[]
  goalsById:    Record<string, Goal>
  spaces:       Space[]
  spacesById:   Record<string, Space>
  tasks:        Task[]   // my-work tasks for the current user
  tasksById:    Record<string, Task>
  // Edits applied to any task, so lists that hold their own copy (e.g. a space's
  // task list) reflect changes made in the task detail panel without a refetch.
  taskOverrides: Record<string, Partial<Task>>
  documents:    Document[]
  inboxItems:   InboxItem[]
  meetings:     Meeting[]
  meetingsById: Record<string, Meeting>
  threadPosts:  ThreadPost[]
  threadPostsBySpaceId: (spaceId: string | null) => ThreadPost[]
  // Status
  loading: boolean
  error:   string | null
  // Optimistic mutations
  addTask:         (task: Task) => void
  updateTask:      (taskId: string, updates: Partial<Task>) => void
  addDocument:     (doc: Document) => void
  updateDocument:  (docId: string, updates: Partial<Document>) => void
  addPost:         (post: ThreadPost) => void
  markRead:        (inboxId: string) => void
  markAllRead:     () => void
  addMeeting:      (meeting: Meeting) => void
  updateMeeting:   (meetingId: string, updates: Partial<Meeting>) => void
  refreshSpaceTasks: (spaceId: string) => Promise<Task[]>
}

const DataContext = createContext<DataState | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Seed with mock data so the first render is never blank.
  // API data replaces these silently once it loads.
  const [users,       setUsers]       = useState<User[]>(mockUsers)
  const [goals,       setGoals]       = useState<Goal[]>(mockGoals)
  const [spaces,      setSpaces]      = useState<Space[]>(mockSpaces)
  const [tasks,       setTasks]       = useState<Task[]>(mockTasks)
  const [documents,   setDocuments]   = useState<Document[]>(mockDocuments)
  const [inboxItems,  setInboxItems]  = useState<InboxItem[]>(mockInbox)
  const [meetings,    setMeetings]    = useState<Meeting[]>(mockMeetings)
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>(mockPosts)
  const [taskOverrides, setTaskOverrides] = useState<Record<string, Partial<Task>>>({})
  const [loading,     setLoading]     = useState(false)  // mock data is ready immediately
  const [error,       setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch everything in parallel
      const [rawUsers, rawGoals, rawSpaces, rawPosts, rawMyWork, rawDocs, rawInbox, rawMeetings] =
        await Promise.all([
          api.getUsers(),
          api.getGoals(),
          api.getSpaces(),
          api.getAllPosts(),
          api.getMyWork(),
          api.getDocuments(),
          api.getInbox(),
          api.getMeetings(),
        ])

      // Map in dependency order
      const mappedUsers   = rawUsers.map(api.mapUser)
      const mappedPosts   = rawPosts.map(api.mapPost)
      const mappedSpaces  = rawSpaces.map(s => api.mapSpace(s, rawPosts))
      const mappedGoals   = rawGoals.map(g => api.mapGoal(g, rawSpaces))
      const mappedTasks   = rawMyWork.map(api.mapTask)
      const mappedDocs    = rawDocs.map(api.mapDocument)

      // Inbox needs taskIds and docIds to generate text
      const taskLookup = Object.fromEntries(mappedTasks.map(t => [t.id, t]))
      const docLookup  = Object.fromEntries(mappedDocs.map(d => [d.id, { title: d.title }]))
      const mappedInbox = rawInbox.map(i => api.mapInboxItem(i, taskLookup, docLookup))
      const mappedMeetings = rawMeetings.map(api.mapMeeting)

      setUsers(mappedUsers)
      setGoals(mappedGoals)
      setSpaces(mappedSpaces)
      setTasks(mappedTasks)
      setDocuments(mappedDocs)
      setInboxItems(mappedInbox)
      setMeetings(mappedMeetings)
      setThreadPosts(mappedPosts)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setError(msg)
      console.error('[DataContext]', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Mutations (optimistic) ─────────────────────────────────────────────────

  const addTask = useCallback((task: Task) => {
    setTasks(prev => [task, ...prev])
  }, [])

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    setTaskOverrides(prev => ({ ...prev, [taskId]: { ...prev[taskId], ...updates } }))
  }, [])

  const addDocument = useCallback((doc: Document) => {
    setDocuments(prev => [doc, ...prev])
  }, [])

  const updateDocument = useCallback((docId: string, updates: Partial<Document>) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d))
  }, [])

  const addPost = useCallback((post: ThreadPost) => {
    setThreadPosts(prev => [...prev, post])
    // If it's a status post, update the space's latestStatusPost
    if (post.kind === 'status' && post.spaceId) {
      setSpaces(prev => prev.map(s =>
        s.id === post.spaceId ? { ...s, latestStatusPost: post } : s
      ))
    }
  }, [])

  const markRead = useCallback((inboxId: string) => {
    setInboxItems(prev => prev.map(i => i.id === inboxId ? { ...i, read: true } : i))
    api.markInboxRead(inboxId).catch(console.error)
  }, [])

  const markAllRead = useCallback(() => {
    setInboxItems(prev => prev.map(i => ({ ...i, read: true })))
    api.markAllInboxRead().catch(console.error)
  }, [])

  const addMeeting = useCallback((meeting: Meeting) => {
    setMeetings(prev => [meeting, ...prev])
  }, [])

  const updateMeeting = useCallback((meetingId: string, updates: Partial<Meeting>) => {
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, ...updates } : m))
  }, [])

  // Fetch all tasks for a specific space (used by SpaceDetail)
  const refreshSpaceTasks = useCallback(async (spaceId: string): Promise<Task[]> => {
    const rawTasks = await api.getTasksBySpace(spaceId)
    return rawTasks.map(api.mapTask)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const usersById    = Object.fromEntries(users.map(u   => [u.id, u]))
  const goalsById    = Object.fromEntries(goals.map(g   => [g.id, g]))
  const spacesById   = Object.fromEntries(spaces.map(s  => [s.id, s]))
  const tasksById    = Object.fromEntries(tasks.map(t   => [t.id, t]))
  const meetingsById = Object.fromEntries(meetings.map(m => [m.id, m]))

  const threadPostsBySpaceId = useCallback(
    (spaceId: string | null) => threadPosts.filter(p => p.spaceId === spaceId),
    [threadPosts],
  )

  const value: DataState = {
    users, usersById, goals, goalsById, spaces, spacesById,
    tasks, tasksById, taskOverrides, documents, inboxItems, meetings, meetingsById,
    threadPosts, threadPostsBySpaceId,
    loading, error,
    addTask, updateTask, addDocument, updateDocument, addPost, markRead, markAllRead,
    addMeeting, updateMeeting, refreshSpaceTasks,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
