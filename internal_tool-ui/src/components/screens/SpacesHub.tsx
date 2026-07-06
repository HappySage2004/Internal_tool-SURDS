import { useState, type MouseEvent as ReactMouseEvent } from 'react'
import { Plus, FileText, BookOpen, Clipboard, Lock, ExternalLink } from 'lucide-react'
import { useData } from '../../context/DataContext'
import * as apiClient from '../../api'
import { getLinkProvider } from '../../lib/linkProvider'
import type { Space, DocType, User, Goal, Document, ThreadPost } from '../../types'
import { Avatar } from '../ui/Avatar'
import { HealthDot } from '../ui/HealthDot'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ThreadFeed } from '../ui/ThreadFeed'
import { DocumentViewer } from '../panels/DocumentViewer'

interface SpacesHubProps {
  onSelectSpace: (spaceId: string) => void
}

function docTypeIcon(docType?: DocType) {
  if (docType === 'spec') return BookOpen
  if (docType === 'decision_log') return Clipboard
  return FileText
}

function SpaceCard({ space, docCount, onSelect, usersById, goalsById }: {
  space: Space
  docCount: number
  onSelect: () => void
  usersById: Record<string, User>
  goalsById: Record<string, Goal>
}) {
  const owner = space.ownerId ? usersById[space.ownerId] : undefined
  const health = space.latestStatusPost?.health ?? 'on_track'
  const relatedGoals = space.goalIds.map(id => goalsById[id]).filter(Boolean) as Goal[]
  const latestPost = space.latestStatusPost

  return (
    <button
      onClick={onSelect}
      className="
        w-full flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border)] text-left
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

        {/* Latest status excerpt */}
        {latestPost ? (
          <p className="text-[12px] text-[var(--text-muted)] truncate mt-1">{latestPost.body}</p>
        ) : (
          <p className="text-[12px] text-[var(--text-faint)] mt-1">No updates yet</p>
        )}

        {/* Chips: goals + doc count */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {relatedGoals.map(goal => (
            <span key={goal.id} className="text-[11px] text-[var(--text-faint)]">
              ↗ {goal.title}
            </span>
          ))}
          {docCount > 0 && (
            <span className="mono text-[11px] text-[var(--text-faint)]">{docCount} docs</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {owner && <Avatar user={owner} size="sm" />}
        {latestPost && (
          <span className="mono text-[11px] text-[var(--text-faint)]">{latestPost.createdAt}</span>
        )}
      </div>
    </button>
  )
}

const RAIL_MIN = 240
const RAIL_MAX = 640

export function SpacesHub({ onSelectSpace }: SpacesHubProps) {
  const { spaces, usersById, goalsById, documents, spacesById, threadPostsBySpaceId, addPost, addDocument } = useData()
  const engineeringSpaces = spaces.filter(s => s.mode === 'engineering')
  const workstreamSpaces  = spaces.filter(s => s.mode === 'workstream')
  const [localGeneralPosts, setLocalGeneralPosts] = useState<ThreadPost[]>([])
  const [railWidth, setRailWidth] = useState(340)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [viewerEditing, setViewerEditing] = useState(false)

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
    const optimistic: ThreadPost = { id: `local-gen-${Date.now()}`, spaceId: null, authorId: 'aaryan', kind: 'message', body, createdAt: 'just now' }
    setLocalGeneralPosts(prev => [...prev, optimistic])
    try {
      const raw = await apiClient.createPost({ space_id: null, kind: 'message', body })
      addPost(apiClient.mapPost(raw))
    } catch (e) { console.error(e) }
  }

  const handleNewDoc = async () => {
    try {
      const raw = await apiClient.createDocument({ title: 'Untitled', doc_type: 'note', content: '' })
      const doc = apiClient.mapDocument(raw)
      addDocument(doc)
      setViewerEditing(true)
      setViewerDoc(doc)
    } catch (e) { console.error(e) }
  }

  // Doc counts per space (for the space cards)
  const docCountBySpace: Record<string, number> = {}
  for (const doc of documents) {
    if (doc.spaceId) docCountBySpace[doc.spaceId] = (docCountBySpace[doc.spaceId] ?? 0) + 1
  }

  // Group docs by space (+ personal) for the Docs rail
  const docsGrouped: Record<string, Document[]> = {}
  for (const doc of documents) {
    const key = doc.spaceId ?? '__personal__'
    if (!docsGrouped[key]) docsGrouped[key] = []
    docsGrouped[key].push(doc)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main pane — all spaces */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-8 pb-12">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[21px] font-medium text-[var(--text)]">Spaces</h1>
            <Button variant="primary" size="sm">
              <Plus size={14} />
              New space
            </Button>
          </div>

          <div className="space-y-6">
            {engineeringSpaces.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-1 mb-2">
                  Engineering
                </h2>
                <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
                  {engineeringSpaces.map(space => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      docCount={docCountBySpace[space.id] ?? 0}
                      onSelect={() => onSelectSpace(space.id)}
                      usersById={usersById}
                      goalsById={goalsById}
                    />
                  ))}
                </div>
              </div>
            )}

            {workstreamSpaces.length > 0 && (
              <div>
                <h2 className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider px-1 mb-2">
                  Workstreams
                </h2>
                <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
                  {workstreamSpaces.map(space => (
                    <SpaceCard
                      key={space.id}
                      space={space}
                      docCount={docCountBySpace[space.id] ?? 0}
                      onSelect={() => onSelectSpace(space.id)}
                      usersById={usersById}
                      goalsById={goalsById}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Docs rail */}
      <div className="hidden lg:flex flex-col border-l border-[var(--border)] overflow-hidden" style={{ width: 300 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Docs</span>
          <button
            onClick={handleNewDoc}
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline transition-colors duration-150"
          >
            <Plus size={13} />
            New doc
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {documents.length === 0 ? (
            <p className="text-[12px] text-[var(--text-faint)] py-1">No docs yet.</p>
          ) : (
            Object.entries(docsGrouped).map(([key, docs]) => {
              const isPersonal = key === '__personal__'
              const groupName = isPersonal ? 'Personal' : (spacesById[key]?.name ?? key)
              return (
                <div key={key}>
                  <h3 className="text-[10px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-1 flex items-center gap-1">
                    {isPersonal && <Lock size={9} />}
                    {groupName}
                  </h3>
                  <div className="space-y-0.5">
                    {docs.map(doc => {
                      if (doc.url) {
                        const provider = getLinkProvider(doc.url)
                        const Icon = provider.icon
                        return (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={`${provider.label} · ${doc.url}`}
                            className="group flex items-center gap-2 py-1.5 cursor-pointer hover:text-[var(--text)] transition-colors duration-150"
                          >
                            <Icon size={13} className="flex-shrink-0" style={{ color: provider.color }} />
                            <span className="flex-1 text-[13px] text-[var(--text)] truncate">{doc.title}</span>
                            <ExternalLink size={11} className="text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0" />
                          </a>
                        )
                      }
                      const Icon = docTypeIcon(doc.docType)
                      return (
                        <button
                          key={doc.id}
                          onClick={() => { setViewerEditing(false); setViewerDoc(doc) }}
                          className="w-full flex items-center gap-2 py-1.5 cursor-pointer hover:text-[var(--text)] transition-colors duration-150 text-left"
                        >
                          <Icon size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                          <span className="flex-1 text-[13px] text-[var(--text)] truncate">{doc.title}</span>
                          <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{doc.updatedAt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* General thread rail */}
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

      {/* Document viewer / editor */}
      {viewerDoc && (
        <DocumentViewer
          doc={viewerDoc}
          initialEditing={viewerEditing}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  )
}
