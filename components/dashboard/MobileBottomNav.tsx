"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Zap, Users, BarChart3, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAccessibility } from "@/components/ui/accessibility"

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Initiatives",
    href: "/dashboard/initiatives",
    icon: Zap,
  },
  {
    label: "Areas",
    href: "/dashboard/areas",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    label: "Upload",
    href: "/dashboard/upload",
    icon: Upload,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { announceToScreenReader, prefersReducedMotion } = useAccessibility()

  const handleNavigation = (label: string, isActive: boolean) => {
    if (!isActive) {
      announceToScreenReader(`Navigating to ${label}`, 'polite')
    }
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-white/10"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-all min-h-[64px] min-w-[64px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset touch-manipulation",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
              onClick={() => handleNavigation(item.label, isActive)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item.label}${isActive ? ' - current page' : ''}`}
              tabIndex={0}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive && !prefersReducedMotion && "scale-110"
                )}
                aria-hidden="true"
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
      
      {/* Bottom safe area for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-gray-900/95" />
    </nav>
  )
}