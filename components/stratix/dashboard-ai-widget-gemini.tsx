'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { DialogflowProductionWidget } from '@/components/dialogflow-production-widget'

interface DashboardAIWidgetGeminiProps {
  className?: string
  position?: 'sidebar' | 'top' | 'bottom' | 'floating'
  minimized?: boolean
  onMinimize?: (minimized: boolean) => void
}

export function DashboardAIWidgetGemini({
  className,
  position = 'sidebar',
  minimized = false,
  onMinimize
}: DashboardAIWidgetGeminiProps) {
  // Deprecated component content replaced with Dialogflow CX widget
  // The Dialogflow widget renders a floating bubble; we keep a minimal wrapper for compatibility.
  return (
    <div className={cn(
      position === 'floating' && 'fixed bottom-4 right-4 z-50',
      className
    )}>
      <DialogflowProductionWidget position="bottom-right" expanded={!minimized} />
    </div>
  )
}