import type { User } from '../../types'

interface AvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: { px: 24, text: '10px' },
  md: { px: 28, text: '11px' },
  lg: { px: 32, text: '12px' },
}

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const { px, text } = sizeMap[size]

  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-medium select-none"
      style={{
        width: px,
        height: px,
        backgroundColor: user.color,
        fontSize: text,
        color: '#fff',
        lineHeight: 1,
      }}
      title={user.name}
    >
      {user.initials}
    </span>
  )
}
