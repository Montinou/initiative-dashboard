"use client"

import React from "react"
import { DialogflowChatWidget } from "@/components/dialogflow-chat-widget"

export function StratixAssistantGemini() {
  return (
    <div className="min-h-screen">
      <DialogflowChatWidget expanded />
    </div>
  )
}