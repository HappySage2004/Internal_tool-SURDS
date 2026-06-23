import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useData } from '../../context/DataContext'
import type { Meeting } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import * as api from '../../api'

interface MeetingsProps {
  onSelectMeeting: (meetingId: string) => void
}

function MeetingRow({ meeting, onSelect, usersById }: {
  meeting: Meeting
  onSelect: () => void
  usersById: Record<string, import('../../types').User>
}) {
  const attendees = meeting.attendeeIds.map(id => usersById[id]).filter(Boolean).slice(0, 4)

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] text-left hover:bg-[var(--canvas)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#5B57E0]"
      style={{ minHeight: 44 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-medium text-[var(--text)]">{meeting.title}</span>
          <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{meeting.scheduledAt}</span>
        </div>
        {meeting.outcomes && (
          <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">{meeting.outcomes}</p>
        )}
      </div>
      <div className="flex items-center flex-shrink-0" style={{ paddingRight: 4 }}>
        {attendees.map((user, idx) => user && (
          <span
            key={user.id}
            style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: attendees.length - idx }}
            className="relative inline-block"
          >
            <Avatar user={user} size="sm" />
          </span>
        ))}
        {meeting.attendeeIds.length > 4 && (
          <span className="mono text-[11px] text-[var(--text-faint)] ml-1">
            +{meeting.attendeeIds.length - 4}
          </span>
        )}
      </div>
    </button>
  )
}

function CreateMeetingModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (meeting: Meeting) => void
}) {
  const { users } = useData()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [actionItems, setActionItems] = useState<string[]>([])
  const [newActionText, setNewActionText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleAttendee = (id: string) =>
    setAttendeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const addActionItem = () => {
    const t = newActionText.trim()
    if (!t) return
    setActionItems(prev => [...prev, t])
    setNewActionText('')
  }

  const handleCreate = async () => {
    const t = title.trim()
    if (!t) return
    const scheduledAt = date && time
      ? `${date}T${time}`
      : date || new Date().toISOString().slice(0, 10)
    setSaving(true)
    setError(null)
    try {
      const raw = await api.createMeeting({
        title: t,
        scheduled_at: scheduledAt,
        attendee_ids: attendeeIds,
        action_items: actionItems.map(text => ({ text })),
      })
      onCreated(api.mapMeeting(raw))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
      setSaving(false)
    }
  }

  // Enter submits only from the title/date/time fields; sub-inputs handle their own keys.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-[440px] max-h-[85vh] flex flex-col"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <span className="text-[13px] font-medium text-[var(--text-muted)]">New meeting</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-faint)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto">
          {/* Title */}
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Meeting title"
            className="w-full text-[18px] font-medium text-[var(--text)] bg-transparent outline-none placeholder:text-[var(--text-faint)]"
          />

          {/* Date + time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[11px] text-[var(--text-faint)] mb-1">Date</p>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all"
              />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-[var(--text-faint)] mb-1">Time</p>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <p className="text-[11px] text-[var(--text-faint)] mb-1.5">Attendees</p>
            <div className="flex flex-wrap gap-1.5">
              {users.map(u => {
                const selected = attendeeIds.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleAttendee(u.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[12px] border transition-all duration-150"
                    style={{
                      borderColor: selected ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: selected ? 'var(--accent-soft)' : 'transparent',
                      color: selected ? 'var(--accent)' : 'var(--text-muted)',
                    }}
                  >
                    <Avatar user={u} size="sm" />
                    <span>{u.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action items */}
          <div>
            <p className="text-[11px] text-[var(--text-faint)] mb-1.5">Action items</p>
            {actionItems.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {actionItems.map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] text-[var(--text)]">
                    <span className="flex-1">{text}</span>
                    <button
                      onClick={() => setActionItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={newActionText}
                onChange={e => setNewActionText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addActionItem() }
                }}
                placeholder="Add an action item… (↵ to add)"
                className="flex-1 text-[13px] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 outline-none placeholder:text-[var(--text-faint)] text-[var(--text)] focus:ring-2 focus:ring-[#5B57E0] transition-all"
              />
              <button
                onClick={addActionItem}
                disabled={!newActionText.trim()}
                className="p-2 rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] disabled:opacity-40 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--canvas)] rounded-b-[10px] flex-shrink-0">
          <span className="text-[11px] text-[var(--text-faint)]">
            Press <kbd className="mono text-[10px] px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">↵ Enter</kbd> to create
          </span>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#5B57E0]"
          >
            {saving ? 'Creating…' : 'Create meeting'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Meetings({ onSelectMeeting }: MeetingsProps) {
  const { meetings, usersById, addMeeting } = useData()
  const [showCreate, setShowCreate] = useState(false)
  const sorted = [...meetings].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[21px] font-medium text-[var(--text)]">Meetings</h1>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New meeting
          </Button>
        </div>

        {sorted.length === 0 ? (
          <p className="text-[13px] text-[var(--text-faint)] py-4">No meetings logged yet.</p>
        ) : (
          <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
            {sorted.map(meeting => (
              <MeetingRow
                key={meeting.id}
                meeting={meeting}
                onSelect={() => onSelectMeeting(meeting.id)}
                usersById={usersById}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMeetingModal
          onClose={() => setShowCreate(false)}
          onCreated={meeting => addMeeting(meeting)}
        />
      )}
    </div>
  )
}
