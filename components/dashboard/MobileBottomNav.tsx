"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Zap, Users, BarChart3, Target } from "lucide-react"
import { cn } from "@/lib/utils"

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
    label: "Objectives",
    href: "/dashboard/objectives",
    icon: Target,
  },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-white/10">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-all",
                isActive
                  ? "text-primary"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-all",
                isActive && "scale-110"
              )} />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}