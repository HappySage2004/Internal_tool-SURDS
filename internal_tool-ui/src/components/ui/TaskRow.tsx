import { Lock } from 'lucide-react'
import type { Task } from '../../types'
import { usersById, spacesById } from '../../data/mock'
import { StatusPill } from './StatusPill'
import { PriorityFlag } from './PriorityFlag'
import { Avatar } from './Avatar'
import { Badge } from './Badge'

interface TaskRowProps {
  task: Task
  onClick: (taskId: string) => void
  showSpace?: boolean
}

const statusDotColor: Record<string, string> = {
  backlog:     '#A1A1AA',
  todo:        '#71717A',
  in_progress: '#2F6FED',
  in_review:   '#C77700',
  done:        '#157F4B',
  canceled:    '#A1A1AA',
}

export function TaskRow({ task, onClick, showSpace = false }: TaskRowProps) {
  const isDone = task.status === 'done'
  const isCanceled = task.status === 'canceled'
  const isMuted = isDone || isCanceled
  const assignee = task.assigneeId ? usersById[task.assigneeId] : undefined
  const space = task.spaceId ? spacesById[task.spaceId] : undefined
  const tagSpace = task.tagSpaceId ? spacesById[task.tagSpaceId] : undefined

  return (
    <div
      role="button"
      tabIndex={0}
      className="
        flex items-center gap-2 px-3 h-[38px] cursor-pointer select-none
        transition-all duration-150 ease-in-out
        hover:bg-[var(--surface)] rounded-[6px]
        focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
        group
      "
      onClick={() => onClick(task.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(task.id) }}
    >
      {/* Status dot */}
      <span
        className="flex-shrink-0 w-3 h-3 rounded-full border-2 transition-all duration-150"
        style={{
          borderColor: statusDotColor[task.status],
          backgroundColor: isDone ? statusDotColor[task.status] : 'transparent',
        }}
      />

      {/* Task key */}
      {task.key && (
        <span className="mono text-[11px] text-[var(--text-faint)] flex-shrink-0 w-16">
          {task.key}
        </span>
      )}

      {/* Title */}
      <span
        className={`flex-1 truncate text-[14px] ${
          isMuted ? 'text-[var(--text-faint)]' : 'text-[var(--text)]'
        } ${isMuted ? 'line-through' : ''}`}
      >
        {task.title}
      </span>

      {/* Space or personal badge */}
      {showSpace && (space || task.isPersonal) && (
        <span className="flex-shrink-0">
          {task.isPersonal ? (
            <Badge variant="muted">
              <Lock size={10} />
              private
            </Badge>
          ) : space ? (
            <Badge variant="default">{space.name}</Badge>
          ) : null}
        </span>
      )}

      {/* Tag space (for personal tasks tagged to a space) */}
      {task.isPersonal && tagSpace && (
        <Badge variant="default">{tagSpace.name}</Badge>
      )}

      {/* Priority flag */}
      {task.priority && (
        <span className="flex-shrink-0">
          <PriorityFlag priority={task.priority} size={14} />
        </span>
      )}

      {/* Assignee avatar */}
      {assignee && (
        <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Avatar user={assignee} size="sm" />
        </span>
      )}

      {/* Status pill on hover */}
      <span className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <StatusPill status={task.status} size="sm" />
      </span>
    </div>
  )
}
