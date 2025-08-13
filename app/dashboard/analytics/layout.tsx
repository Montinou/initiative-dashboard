"use client"

import React from "react"
import { AnalyticsFilterProvider } from "@/contexts/AnalyticsFilterContext"

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnalyticsFilterProvider>
      {children}
    </AnalyticsFilterProvider>
  )
}