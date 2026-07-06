import { Sheet, FileText, Presentation, Figma, NotebookText, Link, type LucideIcon } from 'lucide-react'

export interface LinkProvider {
  label: string
  icon: LucideIcon
  color: string   // icon color (brand-ish, still flat)
}

const GENERIC: LinkProvider = { label: 'Link', icon: Link, color: 'var(--text-muted)' }

/**
 * Derive a display provider (icon + label + color) from an external URL's host
 * and path. Purely presentational — nothing is persisted beyond the URL itself.
 */
export function getLinkProvider(url: string): LinkProvider {
  let host = ''
  let path = ''
  try {
    const u = new URL(url)
    host = u.hostname.toLowerCase()
    path = u.pathname.toLowerCase()
  } catch {
    return GENERIC
  }

  if (host.endsWith('docs.google.com')) {
    if (path.startsWith('/spreadsheets')) return { label: 'Google Sheets', icon: Sheet, color: '#0F9D58' }
    if (path.startsWith('/presentation')) return { label: 'Google Slides', icon: Presentation, color: '#F4B400' }
    if (path.startsWith('/document'))     return { label: 'Google Docs', icon: FileText, color: '#4285F4' }
    return { label: 'Google', icon: FileText, color: '#4285F4' }
  }
  if (host.endsWith('figma.com'))  return { label: 'Figma', icon: Figma, color: '#A259FF' }
  if (host.endsWith('notion.so'))  return { label: 'Notion', icon: NotebookText, color: 'var(--text)' }

  return GENERIC
}
