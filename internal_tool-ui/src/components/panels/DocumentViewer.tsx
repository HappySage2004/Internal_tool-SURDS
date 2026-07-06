import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { X, Pencil } from 'lucide-react'
import { useData } from '../../context/DataContext'
import * as apiClient from '../../api'
import type { Document } from '../../types'
import { Button } from '../ui/Button'

interface DocumentViewerProps {
  doc: Document
  onClose: () => void
  initialEditing?: boolean
}

export function DocumentViewer({ doc, onClose, initialEditing = false }: DocumentViewerProps) {
  const { updateDocument } = useData()
  const isFile = doc.fileKind !== undefined
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [loading, setLoading] = useState(!isFile && doc.content === undefined)
  const [editing, setEditing] = useState(initialEditing && !isFile)
  const [saving, setSaving] = useState(false)

  // Lazily fetch the body if the list response didn't carry it (markdown docs only).
  useEffect(() => {
    if (isFile || doc.content !== undefined) return
    let cancelled = false
    apiClient.getDocument(doc.id)
      .then(raw => { if (!cancelled) setContent(raw.content ?? '') })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [doc.id, doc.content, isFile])

  const handleSave = async () => {
    setSaving(true)
    updateDocument(doc.id, { title, content })   // optimistic
    try {
      await apiClient.updateDocument(doc.id, { title, content })
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
    setEditing(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] w-full max-w-3xl h-[85vh] flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
            {editing ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Untitled"
                className="flex-1 text-[16px] font-medium text-[var(--text)] bg-transparent outline-none placeholder:text-[var(--text-faint)]"
              />
            ) : (
              <h2 className="flex-1 text-[16px] font-medium text-[var(--text)] truncate">{title}</h2>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              {editing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </>
              ) : !isFile && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-150"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          {isFile ? (
            doc.fileKind === 'image' ? (
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[var(--canvas)]">
                <img src={doc.fileUrl} alt={title} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <iframe src={doc.fileUrl} title={title} className="flex-1 w-full border-0" />
            )
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {editing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write markdown…"
                  className="w-full h-full min-h-[300px] text-[14px] text-[var(--text)] bg-transparent resize-none outline-none placeholder:text-[var(--text-faint)] mono leading-relaxed"
                />
              ) : loading ? (
                <p className="text-[13px] text-[var(--text-faint)]">Loading…</p>
              ) : content.trim() ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-[13px] text-[var(--text-faint)]">
                  This doc is empty. Hit <span className="text-[var(--text-muted)]">Edit</span> to write something.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
