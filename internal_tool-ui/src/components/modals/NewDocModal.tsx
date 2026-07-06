import { useState, useRef } from 'react'
import { X, FileText, Upload } from 'lucide-react'
import * as apiClient from '../../api'
import type { Document, Space } from '../../types'
import { Button } from '../ui/Button'

interface NewDocModalProps {
  onClose: () => void
  onCreated: (doc: Document, openInEdit: boolean) => void
  /** When set, the doc is locked to this space (no picker) — used inside a Space. */
  fixedSpaceId?: string
  /** When provided, show a Space picker (Personal + these). Ignored if fixedSpaceId is set. */
  spaces?: Space[]
  /** Preselected space id for the picker; undefined = Personal. */
  defaultSpaceId?: string
}

type DocMode = 'markdown' | 'upload'

export function NewDocModal({ onClose, onCreated, fixedSpaceId, spaces, defaultSpaceId }: NewDocModalProps) {
  const showPicker = !fixedSpaceId && !!spaces
  const [mode, setMode] = useState<DocMode>('markdown')
  const [title, setTitle] = useState('')
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? '')   // '' = Personal
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resolvedSpaceId = fixedSpaceId ?? (spaceId || undefined)

  const handleCreate = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'upload') {
        if (!file) { setError('Choose a PDF or image file.'); setBusy(false); return }
        const raw = await apiClient.uploadDocument(file, { title: title.trim() || undefined, space_id: resolvedSpaceId })
        onCreated(apiClient.mapDocument(raw), false)
      } else {
        const raw = await apiClient.createDocument({
          title: title.trim() || 'Untitled',
          space_id: resolvedSpaceId,
          doc_type: 'note',
          content: '',
        })
        onCreated(apiClient.mapDocument(raw), true)
      }
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
            <h3 className="text-[15px] font-medium text-[var(--text)]">New document</h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[rgba(18,18,28,0.06)] transition-all duration-150"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Type toggle */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Type</p>
              <div className="flex gap-2">
                {([
                  { id: 'markdown' as const, label: 'Markdown doc', Icon: FileText },
                  { id: 'upload' as const, label: 'Upload PDF/image', Icon: Upload },
                ]).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => { setMode(id); setError(null) }}
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

            {/* File input (upload mode) */}
            {mode === 'upload' && (
              <div>
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">File</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-[6px] border border-dashed border-[var(--border)] text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]/40 transition-all duration-150"
                >
                  <Upload size={14} />
                  <span className="truncate">{file ? file.name : 'Choose a PDF or image…'}</span>
                </button>
              </div>
            )}

            {/* Title */}
            <div>
              <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">
                Title <span className="normal-case text-[var(--text-faint)]">(optional)</span>
              </p>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                placeholder={mode === 'upload' ? "Defaults to the file's name" : 'Untitled'}
                className="w-full text-[13px] text-[var(--text)] bg-transparent border border-[var(--border)] rounded-[6px] px-3 py-2 placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
              />
            </div>

            {/* Space picker */}
            {showPicker && (
              <div>
                <p className="text-[11px] font-medium text-[var(--text-faint)] uppercase tracking-wider mb-2">Space</p>
                <select
                  value={spaceId}
                  onChange={e => setSpaceId(e.target.value)}
                  className="w-full text-[13px] text-[var(--text)] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5B57E0] transition-all duration-150"
                >
                  <option value="">Personal (private)</option>
                  {spaces!.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-[12px] text-[#C53434]">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreate} disabled={busy || (mode === 'upload' && !file)}>
                {busy ? 'Creating…' : mode === 'upload' ? 'Upload' : 'Create doc'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
