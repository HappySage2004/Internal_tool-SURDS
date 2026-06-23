import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Search, Layout, FileText, Plus, CheckSquare, ArrowRight } from 'lucide-react'
import { spaces, documents } from '../../data/mock'

interface CommandPaletteProps {
  onClose: () => void
  onNavigateSpace: (spaceId: string) => void
}

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  group: 'navigate' | 'create' | 'actions'
  icon: React.ReactNode
  action: () => void
}

export function CommandPalette({ onClose, onNavigateSpace }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const allItems: CommandItem[] = [
    // Navigate — spaces
    ...spaces.map(space => ({
      id: `space-${space.id}`,
      label: space.name,
      sublabel: space.mode,
      group: 'navigate' as const,
      icon: <Layout size={14} className="text-[var(--text-muted)]" />,
      action: () => { onNavigateSpace(space.id); onClose() },
    })),

    // Navigate — recent docs
    ...documents.slice(0, 3).map(doc => ({
      id: `doc-${doc.id}`,
      label: doc.title,
      sublabel: doc.updatedAt,
      group: 'navigate' as const,
      icon: <FileText size={14} className="text-[var(--text-muted)]" />,
      action: onClose,
    })),

    // Create actions
    {
      id: 'create-task',
      label: 'New task',
      group: 'create' as const,
      icon: <Plus size={14} className="text-[var(--accent)]" />,
      action: onClose,
    },
    {
      id: 'create-doc',
      label: 'New doc',
      group: 'create' as const,
      icon: <Plus size={14} className="text-[var(--accent)]" />,
      action: onClose,
    },
    {
      id: 'create-space',
      label: 'New space',
      group: 'create' as const,
      icon: <Plus size={14} className="text-[var(--accent)]" />,
      action: onClose,
    },

    // Actions
    {
      id: 'action-my-work',
      label: 'Go to My work',
      group: 'actions' as const,
      icon: <CheckSquare size={14} className="text-[var(--text-muted)]" />,
      action: onClose,
    },
  ]

  const filtered = query
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  const groups: { id: 'navigate' | 'create' | 'actions'; label: string }[] = [
    { id: 'navigate', label: 'Navigate' },
    { id: 'create',   label: 'Create'   },
    { id: 'actions',  label: 'Actions'  },
  ]

  const flatItems = filtered
  const clampedIdx = Math.min(activeIdx, flatItems.length - 1)

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flatItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && flatItems[clampedIdx]) {
      flatItems[clampedIdx].action()
    }
  }

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-[560px] overflow-hidden"
        style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={16} className="text-[var(--text-faint)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or jump to..."
            className="flex-1 text-[14px] bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--text-faint)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[var(--text-faint)] hover:text-[var(--text)] transition-colors duration-150"
            >
              ✕
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto max-h-[400px] py-1">
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[var(--text-faint)] px-4 py-6 text-center">
              No results for &quot;{query}&quot;
            </p>
          ) : (
            groups.map(group => {
              const groupItems = filtered.filter(i => i.group === group.id)
              if (groupItems.length === 0) return null

              return (
                <div key={group.id}>
                  <div className="px-4 py-1.5">
                    <span className="text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-wider">
                      {group.label}
                    </span>
                  </div>
                  {groupItems.map(item => {
                    const idx = flatItems.indexOf(item)
                    const isActive = idx === clampedIdx

                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left
                          transition-all duration-150
                          ${isActive
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'hover:bg-[rgba(18,18,28,0.04)]'
                          }
                        `}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className={`flex-1 text-[13px] font-medium ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-[11px] text-[var(--text-faint)]">{item.sublabel}</span>
                        )}
                        {isActive && (
                          <ArrowRight size={12} className="text-[var(--accent)] flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 bg-[var(--canvas)]">
          <span className="text-[11px] text-[var(--text-faint)]">
            <kbd className="mono text-[10px] px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)]">↑↓</kbd> navigate
          </span>
          <span className="text-[11px] text-[var(--text-faint)]">
            <kbd className="mono text-[10px] px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)]">↵</kbd> select
          </span>
          <span className="text-[11px] text-[var(--text-faint)]">
            <kbd className="mono text-[10px] px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)]">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  )
}
