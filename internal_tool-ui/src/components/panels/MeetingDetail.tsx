import { useState, useEffect } from 'react'
import { X, CheckSquare, Square, ArrowRight, Plus } from 'lucide-react'
import type { ActionItem } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { useData } from '../../context/DataContext'
import * as api from '../../api'

interface MeetingDetailProps {
  meetingId: string | null
  onClose: () => void
}

export function MeetingDetail({ meetingId, onClose }: MeetingDetailProps) {
  const { meetingsById, usersById, users, spacesById, updateMeeting: ctxUpdateMeeting } = useData()

  const [title, setTitle] = useState('')
  const [outcomes, setOutcomes] = useState('')
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [newActionText, setNewActionText] = useState('')
  const [showAddAction, setShowAddAction] = useState(false)
  const [showAddAttendee, setShowAddAttendee] = useState(false)

  useEffect(() => {
    if (!meetingId) return
    const m = meetingsById[meetingId]
    if (!m) return
    setTitle(m.title)
    setOutcomes(m.outcomes ?? '')
    setActionItems(m.actionItems.map(ai => ({ ...ai })))
    setShowAddAction(false)
    setShowAddAttendee(false)
    setNewActionText('')
  }, [meetingId, meetingsById])

  if (!meetingId) return null
  const meeting = meetingsById[meetingId]
  if (!meeting) return null

  const attendees = meeting.attendeeIds.map(id => usersById[id]).filter(Boolean)
  const relatedSpaces = (meeting.relatedSpaceIds ?? []).map(id => spacesById[id]).filter(Boolean)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTitleBlur = () => {
    if (title && title !== meeting.title) {
      ctxUpdateMeeting(meetingId, { title })
      api.updateMeeting(meetingId, { title }).catch(console.error)
    }
  }

  const handleOutcomesBlur = () => {
    if (outcomes !== (meeting.outcomes ?? '')) {
      ctxUpdateMeeting(meetingId, { outcomes })
      api.updateMeeting(meetingId, { outcomes }).catch(console.error)
    }
  }

  // Persist the action-item list to context so a re-render (which re-runs the
  // sync effect above from context) doesn't wipe local edits.
  const syncActionItems = (next: ActionItem[]) => {
    setActionItems(next)
    ctxUpdateMeeting(meetingId, { actionItems: next })
  }

  const toggleActionItem = async (id: string) => {
    const ai = actionItems.find(a => a.id === id)
    if (!ai) return
    const done = !ai.done
    syncActionItems(actionItems.map(a => a.id === id ? { ...a, done } : a))
    api.patchMeetingActionItem(meetingId, id, { done }).catch(console.error)
  }

  const convertToTask = async (id: string) => {
    try {
      const updated = await api.convertActionItem(meetingId, id)
      syncActionItems(actionItems.map(a => a.id === id ? { ...a, taskId: updated.taskId ?? `task-${id}` } : a))
    } catch (err) {
      console.error(err)
    }
  }

  const addActionItem = async () => {
    const text = newActionText.trim()
    if (!text) return
    try {
      const created = await api.addMeetingActionItem(meetingId, { text })
      const newAI: ActionItem = { id: created.id, text: created.text, done: created.done, taskId: created.taskId }
      syncActionItems([...actionItems, newAI])
      setNewActionText('')
      setShowAddAction(false)
    } catch (err) {
      console.error(err)
    }
  }

  const setAttendees = (next: string[]) => {
    ctxUpdateMeeting(meetingId, { attendeeIds: next })
    api.updateMeeting(meetingId, { attendee_ids: next }).catch(console.error)
  }

  const addAttendee = (userId: string) => {
    if (meeting.attendeeIds.includes(userId)) return
    setAttendees([...meeting.attendeeIds, userId])
    setShowAddAttendee(false)
  }

  const removeAttendee = (userId: string) => {
    setAttendees(meeting.attendeeIds.filter(id => id !== userId))
  }

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
          <span className="mono text-[12px] text-[var(--text-faint)]">Meeting</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-8 space-y-5">
            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full text-[21px] font-medium text-[var(--text)] bg-transparent outline-none border-b border-transparent focus:border-[var(--accent)] pb-1 transition-colors"
            />

            {/* Date/time */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-1">When</p>
              <span className="mono text-[13px] text-[var(--text-muted)]">{meeting.scheduledAt}</span>
            </div>

            {/* Attendees */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Attendees</p>
              <div className="flex flex-wrap gap-2 items-center">
                {attendees.map(user => user && (
                  <div key={user.id} className="group flex items-center gap-1.5 px-2 py-1 rounded-[6px] border border-[var(--border)] bg-[var(--canvas)]">
                    <Avatar user={user} size="sm" />
                    <span className="text-[12px] text-[var(--text)]">{user.name}</span>
                    <button
                      onClick={() => removeAttendee(user.id)}
                      className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                      title="Remove attendee"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}

                {/* Add attendee */}
                <div className="relative">
                  <button
                    onClick={() => setShowAddAttendee(v => !v)}
                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] border border-dashed border-[var(--border)] text-[12px] text-[var(--text-faint)] hover:text-[var(--text)] hover:border-[var(--text-faint)] transition-all"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                  {showAddAttendee && (
                    <div
                      className="absolute left-0 top-full mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] py-1 z-20 min-w-[180px] max-h-[240px] overflow-y-auto"
                      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    >
                      {users.filter(u => !meeting.attendeeIds.includes(u.id)).length === 0 ? (
                        <p className="px-3 py-2 text-[12px] text-[var(--text-faint)]">Everyone's added.</p>
                      ) : (
                        users.filter(u => !meeting.attendeeIds.includes(u.id)).map(u => (
                          <button
                            key={u.id}
                            onClick={() => addAttendee(u.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[rgba(18,18,28,0.06)] transition-colors"
                          >
                            <Avatar user={u} size="sm" />
                            <span className="text-[13px] text-[var(--text)]">{u.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Outcomes */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Outcomes</p>
              <textarea
                value={outcomes}
                onChange={e => setOutcomes(e.target.value)}
                onBlur={handleOutcomesBlur}
                rows={4}
                placeholder="Write meeting outcomes here…"
                className="w-full text-[13px] text-[var(--text)] bg-transparent resize-none border border-[var(--border)] rounded-[6px] p-3 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
              />
            </div>

            {/* Action items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider">Action items</p>
                <button
                  onClick={() => setShowAddAction(v => !v)}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>

              {actionItems.length === 0 && !showAddAction ? (
                <p className="text-[12px] text-[var(--text-faint)]">No action items yet.</p>
              ) : (
                <div className="space-y-2">
                  {actionItems.map(ai => (
                    <div key={ai.id} className="flex items-start gap-2">
                      <button
                        onClick={() => toggleActionItem(ai.id)}
                        className="mt-0.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
                      >
                        {ai.done
                          ? <CheckSquare size={15} className="text-[var(--accent)]" />
                          : <Square size={15} />
                        }
                      </button>
                      <span className={`flex-1 text-[13px] leading-snug ${ai.done ? 'line-through text-[var(--text-faint)]' : 'text-[var(--text)]'}`}>
                        {ai.text}
                      </span>
                      {ai.taskId ? (
                        <Badge variant="accent">task created</Badge>
                      ) : (
                        <button
                          onClick={() => convertToTask(ai.id)}
                          className="flex items-center gap-1 text-[11px] text-[var(--text-faint)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
                          title="Create task from this action item"
                        >
                          <ArrowRight size={11} />
                          Create task
                        </button>
                      )}
                    </div>
                  ))}

                  {showAddAction && (
                    <div className="flex items-center gap-2 mt-2">
                      <Square size={15} className="text-[var(--text-faint)] flex-shrink-0" />
                      <input
                        autoFocus
                        value={newActionText}
                        onChange={e => setNewActionText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') addActionItem()
                          if (e.key === 'Escape') { setShowAddAction(false); setNewActionText('') }
                        }}
                        placeholder="Action item text… (↵ to save)"
                        className="flex-1 text-[13px] bg-transparent border-b border-[var(--border)] outline-none py-0.5 placeholder:text-[var(--text-faint)] text-[var(--text)] focus:border-[var(--accent)] transition-colors"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Related spaces */}
            {relatedSpaces.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Related spaces</p>
                <div className="flex flex-wrap gap-2">
                  {relatedSpaces.map(space => space && (
                    <Badge key={space.id} variant="default">{space.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
