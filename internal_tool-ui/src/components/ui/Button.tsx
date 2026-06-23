import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const variantMap: Record<string, string> = {
  primary:   'bg-[var(--accent)] text-white hover:opacity-90',
  secondary: 'bg-[rgba(18,18,28,0.06)] text-[var(--text)] border border-[var(--border)] hover:bg-[rgba(18,18,28,0.09)]',
  ghost:     'text-[var(--text-muted)] hover:bg-[rgba(18,18,28,0.06)] hover:text-[var(--text)]',
  danger:    'bg-[#C53434]/10 text-[#C53434] border border-[#C53434]/20 hover:bg-[#C53434]/15',
}

const sizeMap: Record<string, string> = {
  sm: 'text-[13px] px-2.5 py-1.5 h-7',
  md: 'text-[14px] px-3.5 py-2 h-8',
}

export function Button({ children, variant = 'secondary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center gap-1.5 rounded-[6px] font-medium
        transition-all duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[#5B57E0]
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantMap[variant]}
        ${sizeMap[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  )
}
