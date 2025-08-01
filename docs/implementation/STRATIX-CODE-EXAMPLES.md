# Stratix Assistant Code Examples

This document provides concrete code examples to supplement the implementation roadmap.

## 1. Main Assistant Component

```typescript
// components/stratix/StratixAssistant.tsx
"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, MessageSquare, TrendingUp } from "lucide-react"
import { AssistantChat } from "./AssistantChat"
import { InsightsDashboard } from "./InsightsDashboard"
import { useStratixAssistant } from "@/hooks/useStratixAssistant"
import { AssistantLoader } from "./AssistantLoader"

export function StratixAssistant() {
  const { insights, loading, error, refresh } = useStratixAssistant()
  const [activeTab, setActiveTab] = useState("insights")

  if (loading) {
    return <AssistantLoader />
  }

  if (error) {
    return (
      <Card className="backdrop-blur-xl bg-white/5 border border-white/10 p-8">
        <div className="text-center">
          <p className="text-red-400 mb-4">Unable to load Stratix Assistant</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="stratix-assistant-container backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-cyan-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          Stratix Assistant
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="mt-6">
          <InsightsDashboard insights={insights} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <AssistantChat userId={insights?.userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

## 2. KPI Card Component

```typescript
// components/stratix/KPICard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { KPI } from "@/lib/stratix/types"

interface KPICardProps {
  kpi: KPI
}

export function KPICard({ kpi }: KPICardProps) {
  const getTrendIcon = () => {
    switch (kpi.trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-green-400" />
      case 'down':
        return <TrendingDown className="w-5 h-5 text-red-400" />
      default:
        return <Minus className="w-5 h-5 text-gray-400" />
    }
  }

  const getCategoryColor = () => {
    switch (kpi.category) {
      case 'performance':
        return 'from-purple-500/10 to-purple-600/10'
      case 'risk':
        return 'from-red-500/10 to-orange-500/10'
      case 'efficiency':
        return 'from-cyan-500/10 to-blue-500/10'
      default:
        return 'from-gray-500/10 to-gray-600/10'
    }
  }

  return (
    <Card className={`kpi-card backdrop-blur-md bg-gradient-to-br ${getCategoryColor()} border border-white/20 hover:shadow-lg transition-all duration-300`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-200">
          {kpi.name}
        </CardTitle>
        {getTrendIcon()}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {kpi.value}{kpi.unit}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {kpi.description}
        </p>
      </CardContent>
    </Card>
  )
}
```

## 3. Chat Interface Component

```typescript
// components/stratix/AssistantChat.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { useStratixChat } from "@/hooks/useStratixChat"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AssistantChat({ userId }: { userId?: string }) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, loading } = useStratixChat(userId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    await sendMessage(input)
    setInput("")
  }

  return (
    <Card className="backdrop-blur-sm bg-white/5 border border-white/10 h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">Welcome to Stratix Assistant!</p>
            <p className="text-sm">Ask me about your initiatives, KPIs, or get strategic recommendations.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'user-message backdrop-blur-sm bg-purple-500/10 border-l-4 border-purple-500'
                  : 'assistant-message backdrop-blur-sm bg-cyan-500/10 border-l-4 border-cyan-500'
              }`}
            >
              <p className="text-sm text-white">{message.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="assistant-message backdrop-blur-sm bg-cyan-500/10 rounded-lg p-4 border-l-4 border-cyan-500">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your initiatives or request recommendations..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
```

## 4. API Client Implementation

```typescript
// lib/stratix/api-client.ts
import { StratixInsights, StratixResponse, ChatMessage } from './types'

export class StratixAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'StratixAPIError'
  }
}

export class StratixAPIClient {
  private baseURL: string
  private token: string
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(token: string) {
    this.baseURL = process.env.NEXT_PUBLIC_STRATIX_API_URL || ''
    this.token = token
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}:${JSON.stringify(params || {})}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  async getInsights(userId: string): Promise<StratixInsights> {
    const cacheKey = this.getCacheKey('insights', { userId })
    const cached = this.getFromCache<StratixInsights>(cacheKey)
    if (cached) return cached

    const response = await fetch(`${this.baseURL}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      throw new StratixAPIError(response.status, await response.text())
    }

    const data = await response.json()
    this.setCache(cacheKey, data)
    return data
  }

  async sendQuery(userId: string, query: string): Promise<StratixResponse> {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, query }),
    })

    if (!response.ok) {
      throw new StratixAPIError(response.status, await response.text())
    }

    return response.json()
  }

  async streamQuery(
    userId: string, 
    query: string, 
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, query }),
    })

    if (!response.ok) {
      throw new StratixAPIError(response.status, await response.text())
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value)
      onChunk(chunk)
    }
  }
}
```

## 5. Custom Hooks

```typescript
// hooks/useStratixChat.ts
import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { StratixAPIClient } from '@/lib/stratix/api-client'
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function useStratixChat(userId?: string) {
  const { session } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = useCallback(async (content: string) => {
    if (!session?.access_token || !userId) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const client = new StratixAPIClient(session.access_token)
      
      let assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }

      await client.streamQuery(userId, content, (chunk) => {
        assistantMessage.content += chunk
        setMessages(prev => {
          const updated = [...prev]
          const lastMessage = updated[updated.length - 1]
          if (lastMessage?.role === 'assistant') {
            updated[updated.length - 1] = { ...assistantMessage }
          } else {
            updated.push(assistantMessage)
          }
          return updated
        })
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [session, userId])

  return { messages, sendMessage, loading }
}
```

## 6. Page Component

```typescript
// app/stratix-assistant/page.tsx
import { Metadata } from 'next'
import { StratixAssistant } from '@/components/stratix/StratixAssistant'

export const metadata: Metadata = {
  title: 'Stratix Assistant | Strategic AI Advisor',
  description: 'Get personalized insights and recommendations for your initiatives',
}

export default function StratixAssistantPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <StratixAssistant />
    </div>
  )
}
```

## 7. Loading State Component

```typescript
// components/stratix/AssistantLoader.tsx
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AssistantLoader() {
  return (
    <div className="stratix-assistant-container backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="space-y-6">
        {/* Tab skeleton */}
        <Skeleton className="h-10 w-full" />

        {/* KPI Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="backdrop-blur-md bg-white/5 border border-white/20 p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-full" />
            </Card>
          ))}
        </div>

        {/* Action plans skeleton */}
        <Card className="backdrop-blur-md bg-white/5 border border-white/20 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
```

## 8. Navigation Integration

```typescript
// Update components/DashboardNavigation.tsx
import { Brain } from "lucide-react"

// Add to navigation items
const navigationItems = [
  // ... existing items
  {
    name: 'AI Assistant',
    href: '/stratix-assistant',
    icon: Brain,
    badge: insights?.hasNewRecommendations ? 'New' : undefined,
  },
]
```

These code examples provide a solid foundation for implementing the Stratix Assistant feature with proper integration into the existing dashboard architecture.