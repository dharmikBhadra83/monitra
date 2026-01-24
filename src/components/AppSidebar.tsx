"use client"

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Package,
  X,
  Monitor,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Products",
    icon: Package,
    id: "products",
  },
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
  },
  {
    title: "Monitor",
    icon: Monitor,
    id: "monitor",
  },
] as const

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: "dashboard" | "products" | "monitor"
  onTabChange: (tab: "dashboard" | "products" | "monitor") => void
}

export function AppSidebar({ activeTab, onTabChange, ...props }: AppSidebarProps) {
  const { state } = useSidebar()

  const getActiveIndex = () => {
    return navItems.findIndex(item => item.id === activeTab)
  }

  return (
    <>
      <Sidebar
        collapsible="icon"
        side="left"
        variant="sidebar"
        className="border-r border-[var(--color-black-border)] bg-[var(--color-black-bg)] overflow-hidden"
        {...props}
      >
        <SidebarHeader className="border-b border-[var(--color-black-border)]">
          <div className={`flex items-center gap-3 py-4 ${state === "expanded" ? "px-6 justify-start" : "px-2 justify-center"}`}>
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Monitra Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {state === "expanded" && (
              <span className="font-bold text-lg tracking-tight text-[var(--color-black-text)]">
                Monitra
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden">
          <nav
            className="relative p-2 overflow-hidden"
            style={{
              '--main-color': 'var(--color-red-primary)',
              '--main-color-opacity': 'var(--color-red-opacity)',
              '--total-radio': navItems.length
            } as React.CSSProperties}
          >
            <div className="radio-nav-container overflow-hidden">
              {navItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div key={item.id}>
                    <input
                      type="radio"
                      id={`nav-${item.id}`}
                      name="nav-menu"
                      checked={activeTab === item.id}
                      onChange={() => {
                        onTabChange(item.id as "dashboard" | "products" | "monitor")
                      }}
                    />
                    <label htmlFor={`nav-${item.id}`} className={`text-sm flex items-center ${state === "expanded" ? "gap-2 justify-start" : "justify-center"} overflow-hidden`}>
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {state === "expanded" && <span className="truncate">{item.title}</span>}
                    </label>
                  </div>
                )
              })}
              <div className="glider-container">
                <div
                  className="glider"
                  style={{
                    transform: `translateY(${getActiveIndex() * 100}%)`
                  }}
                />
              </div>
            </div>
          </nav>
        </SidebarContent>

        <SidebarFooter className="border-t border-[var(--color-black-border)]">
          <div className="flex w-full items-center justify-center px-2 py-4">
            <Button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="h-9 cursor-pointer  bg-black hover:bg-black/80 border-2 border-[var(--color-red-primary)] text-[var(--color-red-primary)] font-medium text-xs rounded-full transition-all flex items-center justify-center gap-2 group shadow-lg"
              style={{ width: state === "expanded" ? "100%" : "2.5rem" }}
            >
              <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform shrink-0" />
              {state === "expanded" && <span>Logout</span>}
            </Button>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Original Glider Animation Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .radio-nav-container {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 0.5rem;
          overflow: hidden;
          width: 100%;
        }

        .radio-nav-container input {
          cursor: pointer;
          appearance: none;
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .radio-nav-container .glider-container {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(0deg,
              rgba(0, 0, 0, 0) 0%,
              var(--color-black-card) 50%,
              rgba(0, 0, 0, 0) 100%);
          width: 1px;
          pointer-events: none;
        }

        .radio-nav-container .glider-container .glider {
          position: relative;
          height: calc(100% / var(--total-radio));
          width: 100%;
          background: linear-gradient(0deg,
              rgba(0, 0, 0, 0) 0%,
              var(--main-color) 50%,
              rgba(0, 0, 0, 0) 100%);
          transition: transform 0.5s cubic-bezier(0.37, 1.95, 0.66, 0.56);
        }

        .radio-nav-container .glider-container .glider::before {
          content: "";
          position: absolute;
          height: 60%;
          width: 300%;
          top: 50%;
          transform: translateY(-50%);
          background: var(--main-color);
          filter: blur(10px);
        }

        .radio-nav-container .glider-container .glider::after {
          content: "";
          position: absolute;
          left: 0;
          height: 100%;
          width: 150px;
          background: linear-gradient(90deg,
              var(--main-color-opacity) 0%,
              rgba(0, 0, 0, 0) 100%);
        }

        .radio-nav-container label {
          cursor: pointer;
          padding: 0.75rem;
          position: relative;
          color: var(--color-black-text-muted);
          transition: all 0.3s ease-in-out;
          border-radius: 0.75rem;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .radio-nav-container label:hover {
          color: var(--main-color);
        }

        .radio-nav-container input:checked + label {
          color: var(--main-color);
          background: var(--color-black-card);
          border-color: var(--color-red-border);
          box-shadow: 0 0 20px -5px var(--color-red-glow);
        }

        /* Hide labels when collapsed */
        [data-state="collapsed"] .radio-nav-container label span {
          display: none;
        }
      `}} />
    </>
  )
}
