import type { ActiveStatus } from '../../../lib/teamMetrics'

// Status colors mirror the dots in TaskRow / StatusPill so the Team view reads
// as one system with the rest of the app (UI.md §4 — single indigo accent, the
// rest are the shared status hues).
export const STATUS_COLOR: Record<ActiveStatus, string> = {
  in_progress: '#2F6FED',
  in_review:   '#C77700',
  todo:        '#71717A',
  backlog:     '#A1A1AA',
}

export const STATUS_SHORT: Record<ActiveStatus, string> = {
  in_progress: 'ip',
  in_review:   'rv',
  todo:        'td',
  backlog:     'bl',
}

export const STATUS_LABEL: Record<ActiveStatus, string> = {
  in_progress: 'In progress',
  in_review:   'In review',
  todo:        'Todo',
  backlog:     'Backlog',
}
