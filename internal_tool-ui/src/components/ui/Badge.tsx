import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'accent' | 'amber' | 'green' | 'red' | 'muted'
}

const variantMap: Record<string, string> = {
  default: 'bg-[rgba(18,18,28,0.06)] text-[#71717A] border border-[rgba(18,18,28,0.10)]',
  accent:  'bg-[#EEEDFC] text-[#5B57E0] border border-[#5B57E0]/20',
  amber:   'bg-[#C77700]/10 text-[#C77700] border border-[#C77700]/20',
  green:   'bg-[#157F4B]/10 text-[#157F4B] border border-[#157F4B]/20',
  red:     'bg-[#C53434]/10 text-[#C53434] border border-[#C53434]/20',
  muted:   'bg-[rgba(18,18,28,0.04)] text-[#A1A1AA] border border-[rgba(18,18,28,0.06)]',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-[4px] text-[11px] font-medium px-1.5 py-0.5 whitespace-nowrap ${variantMap[variant]}`}>
      {children}
    </span>
  )
}
