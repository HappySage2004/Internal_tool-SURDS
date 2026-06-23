import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Plus, FileText, BookOpen, Clipboard, Lock } from 'lucide-react'
import { useData } from '../../context/DataContext'
import * as apiClient from '../../api'
import type { Space, DocType } from '../../types'
import { Avatar } from '../ui/Avatar'
import { HealthDot } from '../ui/HealthDot'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ThreadFeed } from '../ui/ThreadFeed'

interface SpacesHubProps {
  onSelectSpace: (spaceId: string) => void
}

type HubTab = 'spaces' | 'docs'

function docTypeIcon(docType?: DocType) {
  if (docType === 'spec') return BookOpen
  if (docType === 'decision_log') return Clipboard
  return FileText
}

function SpaceRow({ space, onSelect, usersById, goalsById }: { space: Space; onSelect: () => void; usersById: Record<string, import('../../types').User>; goalsById: Record<string, import('../../types').Goal> }) {
  const owner = space.ownerId ? usersById[space.ownerId] : undefined
  const health = space.latestStatusPost?.health ?? 'on_track'
  const relatedGoals = space.goalIds.map(id => goalsById[id]).filter(Boolean)
  const latestPost = space.latestStatusPost

  return (
    <button
      onClick={onSelect}
      className="
        w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] text-left
        hover:bg-[var(--canvas)] transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#5B57E0]
      "
    >
      <HealthDot health={health} size={8} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[var(--text)]">{space.name}</span>
          <Badge variant={space.mode === 'engineering' ? 'accent' : 'default'}>
            {space.mode === 'engineering' ? 'engineering' : 'workstream'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {relatedGoals.map(goal => goal && (
            <span key={goal.id} className="text-[11px] text-[var(--text-faint)]">
              ↗ {goal.title}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {owner && <Avatar user={owner} size="sm" />}
        {latestPost && (
          <span className="mono text-[11px] text-[var(--text-faint)]">
            updated {latestPost.createdAt}
          </span>
        )}
      </div>
    </button>
  )
}

const RAIL_MIN = 240
const RAIL_MAX = 640

export function SpacesHub({ onSelectSpace }: SpacesHubProps) {
  const { spaces, usersById, goalsById, documents, spacesById, threadPostsBySpaceId, addPost } = useData()
  const engineeringSpaces = spaces.filter(s => s.mode === 'engineering')
  const workstreamSpaces  = spaces.filter(s => s.mode === 'workstream')
  const [activeTab, setActiveTab] = useState<HubTab>('spaces')
  const [localGeneralPosts, setLocalGeneralPosts] = useState<import('../../types').ThreadPost[]>([])
  const [railWidth, setRailWidth] = useState(340)

  function handleRailResizeMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = railWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    function onMouseMove(ev: globalThis.MouseEvent) {
      setRailWidth(Math.max(RAIL_MIN, Math.min(RAIL_MAX, startWidth + (startX - ev.clientX))))
    }
    function onMouseUp() {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const generalPosts = [...threadPostsBySpaceId(null), ...localGeneralPosts]

  const handleSendGeneral = async (body: string) => {
    const optimistic: import('../../types').ThreadPost = { id: `local-gen-${Date.now()}`, spaceId: null, authorId: 'aaryan', kind: 'message', body, createdAt: 'just now' }
    setLocalGeneralPosts(prev => [...prev, optimistic])
    try {
      const raw = await apiClient.createPost({ space_id: null, kind: 'message', body })
      addPost(apiClient.mapPost(raw))
    } catch (e) { console.error(e) }
  }

  // Group docs by space for the Docs tab
  const docsGrouped: Record<string, typeof documents> = {}
  for (const doc of documents) {
    const key = doc.spaceId ?? '__personal__'
    if (!docsGrouped[key]) docsGrouped[key] = []
    docsGrouped[key].push(doc)
  }

  const tabs: { id: HubTab; label: string }[] = [
    { id: 'spaces', label: 'Spaces' },
    { id: 'docs', label: 'Docs' },
  ]

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left pane (main content) */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-8 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[21px] font-medium text-[var(--text)]">Spaces</h1>
            {activeTab === 'spaces' ? (
              <Button variant="primary" size="sm">
                <Plus size={14} />
                New space
              </Button>
            ) : (
              <Button variant="primary" size="sm">
                <Plus size={14} />
                New doc
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 border-b border-[var(--border)] mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all duration-150
                  focus:outline-none
                  ${activeTab === tab.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Spaces tab */}
          {activeTab === 'spaces' && (
            <div className="space-y-6">
              {/* Engineering */}
              {engineeringSpaces.length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-1 mb-2">
                    Engineering
                  </h2>
                  <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
                    {engineeringSpaces.map(space => (
                      <SpaceRow
                        key={space.id}
                        space={space}
                        onSelect={() => onSelectSpace(space.id)}
                        usersById={usersById}
                        goalsById={goalsById}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Workstreams */}
              {workstreamSpaces.length > 0 && (
                <div>
                  <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-1 mb-2">
                    Workstreams
                  </h2>
                  <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
                    {workstreamSpaces.map(space => (
                      <SpaceRow
                        key={space.id}
                        space={space}
                        onSelect={() => onSelectSpace(space.id)}
                        usersById={usersById}
                        goalsById={goalsById}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Docs tab */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              {Object.entries(docsGrouped).map(([key, docs]) => {
                const isPersonal = key === '__personal__'
                const spaceName = isPersonal ? 'Personal' : (spacesById[key]?.name ?? key)
                return (
                  <div key={key}>
                    <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-1 mb-2">
                      {spaceName}
                    </h2>
                    <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
                      {docs.map((doc, idx) => {
                        const Icon = docTypeIcon(doc.docType)
                        const owner = usersById[doc.ownerId]
                        return (
                          <div
                            key={doc.id}
                            className={`
                              flex items-center gap-3 px-4 py-3 cursor-pointer
                              hover:bg-[var(--canvas)] transition-all duration-150
                              ${idx < docs.length - 1 ? 'border-b border-[var(--border)]' : ''}
                            `}
                          >
                            <Icon size={15} className="text-[var(--text-muted)] flex-shrink-0" />
                            <span className="flex-1 text-[14px] text-[var(--text)] truncate">{doc.title}</span>
                            {isPersonal ? (
                              <Badge variant="muted">
                                <Lock size={10} />
                                personal
                              </Badge>
                            ) : (
                              <Badge variant="default">{spaceName}</Badge>
                            )}
                            {owner && <Avatar user={owner} size="sm" />}
                            <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{doc.updatedAt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {documents.length === 0 && (
                <p className="text-[13px] text-[var(--text-faint)] py-4">No documents yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right rail — General thread */}
      {activeTab === 'spaces' && (
        <div
          className="relative hidden md:flex flex-col border-l border-[var(--border)] overflow-hidden"
          style={{ width: railWidth, minWidth: RAIL_MIN }}
        >
          <div
            onMouseDown={handleRailResizeMouseDown}
            className="absolute left-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--accent)]/20 transition-colors duration-150 z-10"
          />
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <span className="text-[13px] font-medium text-[var(--text)]">General</span>
            <p className="text-[11px] text-[var(--text-faint)] mt-0.5">Company-wide thread</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <ThreadFeed
              posts={generalPosts}
              onSend={handleSendGeneral}
              compact
            />
          </div>
        </div>
      )}
    </div>
  )
}
