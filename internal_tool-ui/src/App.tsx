import { useState, useEffect, useCallback } from 'react'
import { useData } from './context/DataContext'
import * as apiClient from './api'
import { Layout } from './components/layout/Layout'
import { Sidebar } from './components/layout/Sidebar'
import { MyWork } from './components/screens/MyWork'
import { Goals } from './components/screens/Goals'
import { SpacesHub } from './components/screens/SpacesHub'
import { SpaceDetail } from './components/screens/SpaceDetail'
import { Team } from './components/screens/Team'
import { Meetings } from './components/screens/Meetings'
import { TaskDetail } from './components/panels/TaskDetail'
import { MeetingDetail } from './components/panels/MeetingDetail'
import { QuickCreate, type CreateTaskOpts } from './components/modals/QuickCreate'
import { CommandPalette } from './components/modals/CommandPalette'

type View = 'my-work' | 'goals' | 'spaces' | 'space-detail' | 'team' | 'meetings'

const NAV_KEY = 'surds.nav'
const VALID_VIEWS: View[] = ['my-work', 'goals', 'spaces', 'space-detail', 'team', 'meetings']

function loadNav(): { view: View; spaceId: string | null } {
  try {
    const raw = localStorage.getItem(NAV_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { view?: View; spaceId?: string | null }
      if (parsed.view && VALID_VIEWS.includes(parsed.view)) {
        return { view: parsed.view, spaceId: parsed.spaceId ?? null }
      }
    }
  } catch { /* ignore malformed prefs */ }
  return { view: 'my-work', spaceId: 'auth' }
}

export default function App() {
  const { addTask } = useData()
  const initialNav = loadNav()
  const [currentView, setCurrentView] = useState<View>(initialNav.view)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(initialNav.spaceId)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Escape — close panels/modals in order of priority
    if (e.key === 'Escape') {
      if (showCommandPalette) { setShowCommandPalette(false); return }
      if (showQuickCreate)    { setShowQuickCreate(false);    return }
      if (selectedTaskId)     { setSelectedTaskId(null);      return }
      if (selectedMeetingId)  { setSelectedMeetingId(null);   return }
    }

    // Meta/Ctrl+K — command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setShowCommandPalette(v => !v)
      return
    }

    // 'c' — quick create (not in input)
    if ((e.key === 'c' || e.key === 'C') && !inInput && !e.metaKey && !e.ctrlKey) {
      setShowQuickCreate(true)
    }
  }, [showCommandPalette, showQuickCreate, selectedTaskId, selectedMeetingId])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Persist navigation so a refresh restores the page the user was on.
  useEffect(() => {
    try {
      localStorage.setItem(NAV_KEY, JSON.stringify({ view: currentView, spaceId: selectedSpaceId }))
    } catch { /* ignore quota/availability errors */ }
  }, [currentView, selectedSpaceId])

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId)
    setCurrentView('space-detail')
  }

  const handleNavigate = (view: View) => {
    setCurrentView(view)
    if (view !== 'space-detail') setSelectedTaskId(null)
  }

  const sidebar = (
    <Sidebar
      currentView={currentView}
      selectedSpaceId={selectedSpaceId}
      onNavigate={handleNavigate}
      onSelectSpace={handleSelectSpace}
      onNewTask={() => setShowQuickCreate(true)}
    />
  )

  const renderScreen = () => {
    switch (currentView) {
      case 'my-work':
        return (
          <MyWork
            onSelectTask={setSelectedTaskId}
            onNewTask={() => setShowQuickCreate(true)}
          />
        )
      case 'goals':
        return (
          <Goals
            onSelectSpace={setSelectedSpaceId}
            onNavigateSpaceDetail={() => setCurrentView('space-detail')}
          />
        )
      case 'spaces':
        return (
          <SpacesHub onSelectSpace={handleSelectSpace} />
        )
      case 'space-detail':
        return selectedSpaceId ? (
          <SpaceDetail spaceId={selectedSpaceId} onSelectTask={setSelectedTaskId} />
        ) : (
          <SpacesHub onSelectSpace={handleSelectSpace} />
        )
      case 'team':
        return (
          <Team onSelectTask={setSelectedTaskId} onSelectSpace={handleSelectSpace} />
        )
      case 'meetings':
        return (
          <Meetings onSelectMeeting={setSelectedMeetingId} />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Layout sidebar={sidebar}>
        {renderScreen()}
      </Layout>

      {/* Task detail panel */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onSelectTask={setSelectedTaskId}
        />
      )}

      {/* Meeting detail panel */}
      <MeetingDetail
        meetingId={selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
      />

      {/* Quick create modal */}
      {showQuickCreate && (
        <QuickCreate
          onClose={() => setShowQuickCreate(false)}
          onCreateTask={async ({ title, status, assigneeId, priority, dueDate, spaceId }: CreateTaskOpts) => {
            try {
              const raw = await apiClient.createTask({
                title,
                status,
                space_id: spaceId,
                assignee_id: assigneeId,
                priority,
                due_date: dueDate,
              })
              addTask(apiClient.mapTask(raw))
            } catch (e) { console.error(e) }
          }}
        />
      )}

      {/* Command palette */}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onNavigateSpace={handleSelectSpace}
        />
      )}
    </>
  )
}
