import { ChevronUp, Flag } from 'lucide-react'
import type { TaskPriority } from '../../types'

interface PriorityFlagProps {
  priority?: TaskPriority
  size?: number
}

export function PriorityFlag({ priority, size = 14 }: PriorityFlagProps) {
  if (!priority || priority === 'low') {
    return (
      <span className="inline-flex items-center" title="Low priority">
        <ChevronUp size={size} className="text-[#A1A1AA]" />
      </span>
    )
  }

  if (priority === 'medium') {
    return (
      <span className="inline-flex items-center -space-x-1" title="Medium priority">
        <ChevronUp size={size} className="text-[#C77700]" />
        <ChevronUp size={size} className="text-[#C77700]" />
      </span>
    )
  }

  // high
  return (
    <span className="inline-flex items-center" title="High priority">
      <Flag size={size} className="text-[#C53434]" fill="#C53434" fillOpacity={0.15} />
    </span>
  )
}
