import { ReactNode } from 'react'

interface LayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--canvas)]">
      {/* Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        {sidebar}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  )
}
