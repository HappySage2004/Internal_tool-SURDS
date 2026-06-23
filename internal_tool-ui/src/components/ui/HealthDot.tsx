import type { Health } from '../../types'

interface HealthDotProps {
  health: Health
  variant?: 'dot' | 'pill'
  size?: number
}

const healthConfig: Record<Health, { color: string; label: string }> = {
  on_track: { color: '#157F4B', label: 'On track' },
  at_risk:  { color: '#C77700', label: 'At risk'  },
  off_track: { color: '#C53434', label: 'Off track' },
}

export function HealthDot({ health, variant = 'dot', size = 6 }: HealthDotProps) {
  const config = healthConfig[health]

  if (variant === 'pill') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-[4px]"
        style={{
          color: config.color,
          backgroundColor: `${config.color}18`,
          border: `1px solid ${config.color}30`,
        }}
      >
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: 5, height: 5, backgroundColor: config.color }}
        />
        {config.label}
      </span>
    )
  }

  return (
    <span
      className="rounded-full flex-shrink-0 inline-block"
      style={{ width: size, height: size, backgroundColor: config.color }}
      title={config.label}
    />
  )
}
