import type { TaskStatus } from '../../types'

interface StatusPillProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  backlog:     { label: 'Backlog',      className: 'text-[#71717A] bg-[#71717A]/10 border border-[#71717A]/20' },
  todo:        { label: 'Todo',         className: 'text-[#71717A] bg-[#71717A]/10 border border-[#71717A]/20' },
  in_progress: { label: 'In progress',  className: 'text-[#2F6FED] bg-[#2F6FED]/10 border border-[#2F6FED]/20' },
  in_review:   { label: 'In review',    className: 'text-[#C77700] bg-[#C77700]/10 border border-[#C77700]/20' },
  done:        { label: 'Done',         className: 'text-[#157F4B] bg-[#157F4B]/10 border border-[#157F4B]/20' },
  canceled:    { label: 'Canceled',     className: 'text-[#A1A1AA] bg-[#A1A1AA]/10 border border-[#A1A1AA]/20' },
}

export function StatusPill({ status, size = 'sm' }: StatusPillProps) {
  const config = statusConfig[status]
  const sizeClass = size === 'sm'
    ? 'text-[11px] px-1.5 py-0.5'
    : 'text-[12px] px-2 py-1'

  return (
    <span className={`inline-flex items-center rounded-[4px] font-medium whitespace-nowrap ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}
