"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Bot, 
  Send, 
  Sparkles, 
  BarChart3, 
  Target, 
  TrendingUp,
  Users,
  Zap,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Brain,
  FileText,
  Loader2,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardNavigation } from "@/components/DashboardNavigation"
import { useAuth, useUserRole } from "@/lib/auth-context"
import { useUserProfile } from "@/hooks/useUserProfile"
import { getThemeFromDomain, generateThemeCSS, CompanyTheme } from "@/lib/theme-config"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useStratixAssistant } from "@/hooks/useStratixAssistant"
import { StratixKPI, StratixInsight, StratixActionPlan } from "@/lib/stratix/api-client"
import { useIsMobile } from "@/hooks/use-mobile"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

export function StratixAssistantClient() {
  const [activeTab, setActiveTab] = useState("stratix")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hola! Soy tu Asistente Stratix. Puedo analizar tus datos, generar KPIs personalizados, identificar oportunidades y crear planes de acción. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState("")
  const [theme, setTheme] = useState<CompanyTheme | null>(null)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const isMobile = useIsMobile()
  
  // Suggested questions based on context
  const suggestedQuestions = [
    "¿Cuáles son las iniciativas más críticas?",
    "¿Qué áreas necesitan más atención?",
    "¿Cómo puedo mejorar la eficiencia presupuestaria?",
    "¿Qué oportunidades de automatización existen?"
  ]
  
  const { session } = useAuth()
  const userRole = useUserRole()
  const { profile: userProfile } = useUserProfile()
  
  // Use the Stratix assistant hook
  const {
    kpis,
    insights,
    actionPlans,
    companyContext,
    isLoadingKPIs,
    isLoadingInsights,
    isLoadingActionPlans,
    isAnalyzing,
    isLoadingContext,
    error,
    chat,
    streamChat,
    clearError,
    refreshContext
  } = useStratixAssistant()

  // Load theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = getThemeFromDomain(window.location.hostname)
      setTheme(currentTheme)
    }
  }, [])

  // Clear error when component unmounts
  useEffect(() => {
    return () => clearError()
  }, [clearError])

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true
    }

    setChatMessages(prev => [...prev, userMessage, loadingMessage])
    const messageToSend = inputMessage
    setInputMessage("")

    try {
      // Use streaming chat for better UX
      let assistantContent = ''
      const assistantMessageId = (Date.now() + 2).toString()
      
      await streamChat(
        messageToSend,
        chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        (chunk) => {
          assistantContent += chunk
          setChatMessages(prev => {
            const filtered = prev.filter(msg => !msg.isLoading)
            return [
              ...filtered,
              {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date()
              }
            ]
          })
        }
      )
    } catch (error) {
      console.error('Chat error:', error)
      
      // Fallback to regular chat if streaming fails
      try {
        const response = await chat(
          messageToSend,
          chatMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        )
        
        const assistantResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }

        setChatMessages(prev => prev.filter(msg => !msg.isLoading).concat(assistantResponse))
      } catch (fallbackError) {
        console.error('Fallback chat error:', fallbackError)
        
        // Final fallback with error message
        const errorResponse: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: 'Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta de nuevo.',
          timestamp: new Date()
        }

        setChatMessages(prev => prev.filter(msg => !msg.isLoading).concat(errorResponse))
      }
    }
  }

  const getImpactColor = useCallback((impact: string) => {
    switch (impact) {
      case 'high':
      case 'urgent':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }, [])

  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-4 w-4" />
      case 'risk':
        return <AlertCircle className="h-4 w-4" />
      case 'recommendation':
        return <Sparkles className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }, [])

  return (
    <>
      {theme && (
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      )}
      
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        {/* Navigation Sidebar */}
        <DashboardNavigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          userProfile={userProfile}
          theme={theme}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Asistente Stratix</h1>
                  <p className="text-sm text-white/60">Análisis inteligente y recomendaciones personalizadas</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {companyContext ? 'Datos Reales' : 'Modo Local'}
                </Badge>
                {error && (
                  <Badge 
                    variant="outline" 
                    className="bg-red-500/20 text-red-400 border-red-500/30 cursor-pointer hover:bg-red-500/30" 
                    onClick={() => {
                      clearError()
                      refreshContext()
                    }}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Error - Clic para reintentar
                  </Badge>
                )}
                <ProfileDropdown />
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Mobile Chat Toggle */}
            {isMobile && (
              <Button
                onClick={() => setIsChatVisible(!isChatVisible)}
                className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-primary shadow-2xl z-50 md:hidden"
                size="icon"
              >
                <MessageSquare className="h-6 w-6" />
              </Button>
            )}
            
            {/* Left Panel - KPIs and Insights */}
            <main className={cn(
              "p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 transition-all duration-300",
              isMobile ? (isChatVisible ? "hidden" : "w-full") : "w-2/3"
            )}>
              
              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-white">Dashboard Ejecutivo</h1>
                  {companyContext && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Datos Sincronizados
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                    <FileText className="h-4 w-4 mr-1" />
                    Exportar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={refreshContext} className="text-white/70 hover:text-white">
                    <Bot className="h-4 w-4 mr-1" />
                    Actualizar Todo
                  </Button>
                </div>
              </div>
              
              {/* KPIs Section */}
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    KPIs Principales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingKPIs ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {kpis.map((kpi, index) => (
                        <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                          <h3 className="text-sm font-medium text-white/90 mb-2">{kpi.name}</h3>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white">{kpi.value}</span>
                            <div className={cn(
                              "flex items-center text-sm",
                              kpi.trend === 'up' ? 'text-green-400' : 
                              kpi.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                            )}>
                              {kpi.trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : 
                               kpi.trend === 'down' ? <ArrowDown className="h-3 w-3 mr-1" /> : null}
                              {kpi.trendValue}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Insights Section */}
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Insights y Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingInsights ? (
                    [...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))
                  ) : (
                    insights.map((insight) => (
                      <div key={insight.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            insight.type === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                            insight.type === 'risk' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          )}>
                            {getTypeIcon(insight.type)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{insight.title}</h3>
                            <p className="text-sm text-white/70 mt-1">{insight.description}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </main>

            {/* Right Panel - Chat Interface */}
            <aside className={cn(
              "border-l border-white/10 flex flex-col transition-all duration-300",
              isMobile ? (isChatVisible ? "fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-xl" : "hidden") : "w-1/3"
            )}>
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Chat con Stratix
                </h2>
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsChatVisible(false)}
                    className="text-white/70 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Suggested questions */}
                  {chatMessages.length === 1 && showSuggestions && (
                    <div className="space-y-3">
                      <p className="text-sm text-white/60 text-center">Preguntas sugeridas:</p>
                      <div className="grid gap-2">
                        {suggestedQuestions.map((question, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="text-left h-auto p-3 text-white/70 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg text-sm"
                            onClick={() => {
                              setInputMessage(question)
                              setShowSuggestions(false)
                            }}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            {question}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg p-3",
                          message.role === 'user' 
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-white' 
                            : 'bg-white/10 backdrop-blur-sm border border-white/10 text-white/90'
                        )}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center mb-2">
                            <Bot className="h-4 w-4 text-primary mr-2" />
                            <span className="text-xs text-white/60 font-medium">Stratix</span>
                          </div>
                        )}
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm">Analizando...</span>
                          </div>
                        ) : (
                          <div className="text-sm">{message.content}</div>
                        )}
                        <div className="text-xs text-white/40 mt-2">
                          {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (inputMessage.trim()) {
                      handleSendMessage()
                      setShowSuggestions(false)
                    }
                  }}
                  className="flex space-x-2"
                >
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Pregunta sobre tus KPIs, iniciativas o áreas..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    disabled={isAnalyzing}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50" 
                    disabled={!inputMessage.trim() || isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}