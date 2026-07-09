import { useState } from 'react'
import { X, Code2, Briefcase } from 'lucide-react'
import * as apiClient from '../../api'
import type { Space, Goal, SpaceMode } from '../../types'
import { Button } from '../ui/Button'

interface NewSpaceModalProps {
  onClose: () => void
  onCreated: (space: Space) => void
  /** Goals selectable to ladder the new space up to (optional). */
  goals?: Goal[]
}

export function NewSpaceModal({ onClose, onCreated, goals }: NewSpaceModalProps) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<SpaceMode>('engineering')
  const [description, setDescription] = useState('')
  const [goalIds, setGoalIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGoal = (id: string) =>
    setGoalIds(prev => (prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]))

  const handleCreate = async () => {
    if (busy) return
    if (!name.trim()) { setError('Give the space a name.'); return }
    setBusy(true)
    setError(null)
    try {
      const raw = await apiClient.createSpace({
        name: name.trim(),
        mode,
        description: description.trim() || undefined,
        goal_ids: goalIds,
      })
      onCreated(apiClient.mapSpace(raw, []))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-[15px] font-medium text-[var(--text)]">New space</h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Name */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Name</p>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder="e.g. Payments platform"
                className="w-full text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
              />
            </div>

            {/* Mode toggle */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Mode</p>
              <div className="flex gap-2">
                {([
                  { id: 'engineering' as const, label: 'Engineering', Icon: Code2 },
                  { id: 'workstream' as const, label: 'Workstream', Icon: Briefcase },
                ]).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[6px] text-[12px] font-medium border transition-all duration-150 ${
                      mode === id
                        ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">
                Description <span className="normal-case text-[var(--text-faint)]">(optional)</span>
              </p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this space for?"
                rows={2}
                className="w-full text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150 resize-none"
              />
            </div>

            {/* Goals */}
            {goals && goals.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">
                  Goals <span className="normal-case text-[var(--text-faint)]">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {goals.map(goal => {
                    const on = goalIds.includes(goal.id)
                    return (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 ${
                          on
                            ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        ↗ {goal.title}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {error && <p className="text-[12px] text-[#C53434]">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={busy || !name.trim()}>
                {busy ? 'Creating…' : 'Create space'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
