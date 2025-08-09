"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bot, 
  Send,
  Sparkles,
  TrendingUp,
  FileText,
  BarChart,
  Target,
  Lightbulb,
  AlertCircle,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardNavigation } from "@/components/DashboardNavigation"
import { useAuth } from "@/lib/auth-context"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useTenantTheme } from "@/lib/tenant-context"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useGeminiAssistant } from "@/hooks/useGeminiAssistant"
import ReactMarkdown from 'react-markdown'

interface SuggestedAction {
  icon: React.ReactNode
  title: string
  description: string
  query: string
}

export function StratixAssistantGemini() {
  const [inputMessage, setInputMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  const theme = useTenantTheme()
  const { session } = useAuth()
  const { userProfile } = useUserProfile()
  
  // Use the new Gemini assistant hook
  const { messages, sendMessage, isLoading, error, clearError } = useGeminiAssistant()

  // Suggested actions based on user role
  const suggestedActions: SuggestedAction[] = [
    {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      title: "Análisis de Progreso",
      description: "Ver el estado actual de OKRs",
      query: "¿Cuál es el progreso general de nuestros OKRs este trimestre?"
    },
    {
      icon: <Target className="h-5 w-5 text-blue-500" />,
      title: "Objetivos Críticos",
      description: "Identificar objetivos en riesgo",
      query: "¿Qué objetivos están en riesgo de no cumplirse?"
    },
    {
      icon: <BarChart className="h-5 w-5 text-purple-500" />,
      title: "Métricas de Rendimiento",
      description: "Analizar KPIs principales",
      query: "Muéstrame un resumen de los KPIs más importantes"
    },
    {
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      title: "Recomendaciones",
      description: "Obtener sugerencias de mejora",
      query: "¿Qué acciones recomiendas para mejorar el rendimiento?"
    }
  ]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return
    
    sendMessage(inputMessage)
    setInputMessage("")
  }

  const handleSuggestedAction = (query: string) => {
    sendMessage(query)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Sidebar Navigation */}
      <DashboardNavigation
        activeTab="stratix"
        setActiveTab={() => {}}
        userRole={userProfile?.role || null}
        userProfile={userProfile}
        theme={theme}
        className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Stratix AI Assistant</h1>
                <p className="text-sm text-white/60">Powered by Google Gemini 2.0</p>
              </div>
            </div>
            <ProfileDropdown
              userProfile={userProfile ? {
                name: userProfile.full_name || userProfile.email || 'User',
                avatar_url: userProfile.avatar_url || undefined,
                role: userProfile.role || 'User'
              } : undefined}
            />
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col p-6">
          <Card className="flex-1 bg-white/5 backdrop-blur-xl border-white/10 flex flex-col">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Chat con AI
                </div>
                {userProfile && (
                  <Badge variant="outline" className="text-white/70">
                    {userProfile.role} - {userProfile.area || 'General'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
                <div className="space-y-4">
                  {/* Welcome message if no messages */}
                  {messages.length === 0 && (
                    <div className="text-center py-12">
                      <Bot className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-white mb-2">
                        ¡Bienvenido a Stratix AI!
                      </h2>
                      <p className="text-white/60 max-w-md mx-auto">
                        Soy tu asistente inteligente para análisis de OKRs, seguimiento de iniciativas 
                        y generación de insights estratégicos.
                      </p>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-4",
                          message.role === 'user' 
                            ? "bg-purple-600 text-white" 
                            : "bg-white/10 text-white"
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                        <p className="text-xs opacity-60 mt-2">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {userProfile?.full_name?.[0] || 'U'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white animate-pulse" />
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                          <span className="text-white/60 text-sm">Pensando...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/20">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-400">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>

              {/* Suggested Actions (show only when no messages or at start) */}
              {messages.length <= 1 && (
                <div className="p-6 border-t border-white/10">
                  <p className="text-white/60 text-sm mb-3">Acciones sugeridas:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {suggestedActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedAction(action.query)}
                        className="flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-left"
                      >
                        <div className="flex-shrink-0 mt-1">{action.icon}</div>
                        <div>
                          <p className="text-white font-medium text-sm">{action.title}</p>
                          <p className="text-white/60 text-xs">{action.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10">
                <div className="flex gap-3">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Escribe tu pregunta sobre OKRs, iniciativas o métricas..."
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder-white/40"
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}