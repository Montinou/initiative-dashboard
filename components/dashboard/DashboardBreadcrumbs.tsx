"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface BreadcrumbItem {
  label: string
  href: string
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const t = useTranslations('navigation')
  
  const routeLabels: Record<string, string> = {
    dashboard: t('dashboard'),
    initiatives: t('initiatives'),
    areas: t('areas'),
    analytics: t('analytics'),
    objectives: t('objectives'),
    "area-comparison": t('areaComparison'),
    "progress-distribution": t('progressDistribution'),
    "status-distribution": t('statusDistribution'),
    "trend-analytics": t('trendAnalytics'),
  }

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
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">{t('home')}</span>
      </Link>

      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        return (
          <React.Fragment key={crumb.href}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="text-foreground font-medium">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
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