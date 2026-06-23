import { Plus, FileText, Lock } from 'lucide-react'
import { documents, spacesById } from '../../data/mock'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export function Docs() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[21px] font-medium text-[var(--text)]">Docs</h1>
          <Button variant="primary" size="sm">
            <Plus size={14} />
            New doc
          </Button>
        </div>

        <div className="border border-[var(--border)] rounded-[8px] overflow-hidden bg-[var(--surface)]">
          {documents.map((doc, idx) => {
            const space = doc.spaceId ? spacesById[doc.spaceId] : undefined
            return (
              <div
                key={doc.id}
                className={`
                  flex items-center gap-3 px-4 py-3 cursor-pointer
                  hover:bg-[var(--canvas)] transition-all duration-150
                  ${idx < documents.length - 1 ? 'border-b border-[var(--border)]' : ''}
                `}
              >
                <FileText size={15} className="text-[var(--text-muted)] flex-shrink-0" />
                <span className="flex-1 text-[14px] text-[var(--text)] truncate">{doc.title}</span>
                {space ? (
                  <Badge variant="default">{space.name}</Badge>
                ) : (
                  <Badge variant="muted">
                    <Lock size={10} />
                    personal
                  </Badge>
                )}
                <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0">{doc.updatedAt}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
