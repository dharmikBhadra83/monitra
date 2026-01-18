"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Brain } from "lucide-react"
import { useSession } from "next-auth/react"

export function HeaderWithSidebar() {
  const { state } = useSidebar()
  const { data: session } = useSession()
  
  // Calculate margin based on sidebar state
  const sidebarWidth = state === "collapsed" ? "4rem" : "16rem"
  
  return (
    <header
      className="fixed top-0 z-50 border-b border-[var(--color-black-border)] bg-[var(--color-black-bg)]/95 backdrop-blur-xl"
      style={{ 
        left: sidebarWidth,
        right: 0,
        transition: 'left 0.2s ease-linear'
      }}
    >
      <div className="px-6 h-16 flex items-center justify-between w-full">
        <div className="flex items-center gap-4 shrink-0">
          <SidebarTrigger className="text-[var(--color-black-text)] hover:bg-[var(--color-black-card-hover)] hover:text-[var(--color-red-primary)]" />
        </div>

        <div className="flex items-center gap-4 ml-auto shrink-0">
          {/* User Profile */}
          {session?.user && (
            <div className="relative user-menu-container shrink-0">
              <div className="w-10 h-10 rounded-full bg-[var(--color-black-card)] border-2 border-[var(--color-black-border)] flex items-center justify-center overflow-hidden">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Brain className="w-5 h-5 text-[var(--color-red-primary)]" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
