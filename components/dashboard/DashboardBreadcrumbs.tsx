"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href: string
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  initiatives: "Initiatives",
  areas: "Areas",
  analytics: "Analytics",
  objectives: "Objectives",
  "area-comparison": "Area Comparison",
  "progress-distribution": "Progress Distribution",
  "status-distribution": "Status Distribution",
  "trend-analytics": "Trend Analytics",
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = ""

  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({ label, href: currentPath })
  })

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm">
      <Link
        href="/"
        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="h-4 w-4 text-gray-600" />
            {isLast ? (
              <span className="text-white font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}