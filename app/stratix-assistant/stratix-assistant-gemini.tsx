"use client"

import React from "react"
import { DialogflowProductionWidget } from "@/components/dialogflow-production-widget"

export function StratixAssistantGemini() {
  return (
    <div className="min-h-screen">
      <DialogflowProductionWidget expanded />
    </div>
  )
}