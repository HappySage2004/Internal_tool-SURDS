import { useState } from 'react'
import { Plus, FileText, Lock, ExternalLink, Image as ImageIcon } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { getLinkProvider } from '../../lib/linkProvider'
import type { Document } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DocumentViewer } from '../panels/DocumentViewer'
import { NewDocModal } from '../modals/NewDocModal'

export function Docs() {
  const { documents, spaces, spacesById, addDocument } = useData()
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [viewerEditing, setViewerEditing] = useState(false)
  const [showNewDoc, setShowNewDoc] = useState(false)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[21px] font-medium text-[var(--text)]">Docs</h1>
          <Button variant="primary" size="sm" onClick={() => setShowNewDoc(true)}>
            <Plus size={14} />
            New doc
          </Button>
        </div>

        <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
          {documents.map((doc, idx) => {
            const space = doc.spaceId ? spacesById[doc.spaceId] : undefined
            const provider = doc.url ? getLinkProvider(doc.url) : undefined
            const Icon = provider?.icon ?? (doc.fileKind === 'image' ? ImageIcon : FileText)
            const rowClass = `
              flex items-center gap-3 px-4 py-3 cursor-pointer
              hover:bg-[var(--canvas)] transition-all duration-150
              ${idx < documents.length - 1 ? 'border-b border-[var(--border)]' : ''}
            `
            const inner = (
              <>
                <Icon
                  size={15}
                  className={provider ? 'flex-shrink-0' : 'text-[var(--text-muted)] flex-shrink-0'}
                  style={provider ? { color: provider.color } : undefined}
                />
                <span className="flex-1 text-[14px] text-[var(--text)] truncate">{doc.title}</span>
                {provider && <Badge variant="muted">{provider.label}</Badge>}
                {space ? (
                  <Badge variant="default">{space.name}</Badge>
                ) : (
                  <Badge variant="muted">
                    <Lock size={10} />
                    personal
                  </Badge>
                )}
                {doc.url
                  ? <ExternalLink size={13} className="text-[var(--text-faint)] flex-shrink-0" />
                  : <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{doc.updatedAt}</span>}
              </>
            )
            return doc.url ? (
              <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer noopener" className={rowClass}>
                {inner}
              </a>
            ) : (
              <button
                key={doc.id}
                onClick={() => { setViewerEditing(false); setViewerDoc(doc) }}
                className={`${rowClass} w-full text-left`}
              >
                {inner}
              </button>
            )
          })}
        </div>
      </div>

      {showNewDoc && (
        <NewDocModal
          spaces={spaces}
          onClose={() => setShowNewDoc(false)}
          onCreated={(doc, openInEdit) => {
            addDocument(doc)
            setViewerEditing(openInEdit)
            setViewerDoc(doc)
            setShowNewDoc(false)
          }}
        />
      )}

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
