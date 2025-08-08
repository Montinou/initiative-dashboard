'use client'

import React, { useState } from 'react'
import { DashboardAIWidgetGemini } from './dashboard-ai-widget-gemini'

export function DashboardAIContainer() {
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <DashboardAIWidgetGemini
        position="floating"
        minimized={isMinimized}
        onMinimize={setIsMinimized}
      />
    </div>
  )
}