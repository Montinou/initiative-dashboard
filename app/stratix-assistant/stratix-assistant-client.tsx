"use client"

import React, { useState, useEffect } from "react"
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
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardNavigation } from "@/components/DashboardNavigation"
import { useAuth, useUserRole } from "@/lib/auth-context"
import { useUserProfile } from "@/hooks/useUserProfile"
import { getThemeFromDomain, generateThemeCSS, CompanyTheme } from "@/lib/theme-config"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useStratixAssistant } from "@/hooks/useStratixAssistant"
import { StratixKPI, StratixInsight, StratixActionPlan } from "@/lib/stratix/api-client"

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
  
  const { session } = useAuth()
  const userRole = useUserRole()
  const { profile: userProfile } = useUserProfile()
  
  // Use the Stratix assistant hook
  const {
    kpis,
    insights,
    actionPlans,
    isLoadingKPIs,
    isLoadingInsights,
    isLoadingActionPlans,
    isAnalyzing,
    error,
    chat,
    streamChat,
    clearError
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

  const getImpactColor = (impact: string) => {
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
  }

  const getTypeIcon = (type: string) => {
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
  }

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
                  AI Activo
                </Badge>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel - KPIs and Insights */}
            <div className="w-2/3 p-6 overflow-y-auto space-y-6">
              {/* KPIs Section */}
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      KPIs Principales
                    </span>
                    <Button variant="ghost" size="sm" className="text-primary">
                      Ver todos
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingKPIs ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {kpis.map((kpi, index) => (
                        <div
                          key={index}
                          className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-primary/30 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-white/60">{kpi.name}</span>
                            <Badge variant="outline" className={cn(
                              "scale-75",
                              kpi.priority === 'high' ? 'border-red-500/50 text-red-400' : 
                              kpi.priority === 'medium' ? 'border-yellow-500/50 text-yellow-400' : 
                              'border-green-500/50 text-green-400'
                            )}>
                              {kpi.priority}
                            </Badge>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold text-white">{kpi.value}</span>
                            <span className={cn(
                              "flex items-center text-sm",
                              kpi.trend === 'up' ? 'text-green-400' : 
                              kpi.trend === 'down' ? 'text-red-400' : 
                              'text-gray-400'
                            )}>
                              {kpi.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : 
                               kpi.trend === 'down' ? <ArrowDown className="h-3 w-3" /> : 
                               <span className="h-3 w-3">-</span>}
                              {Math.abs(kpi.trendValue)}%
                            </span>
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
                      <Skeleton key={i} className="h-32" />
                    ))
                  ) : (
                    insights.map((insight) => (
                      <div
                        key={insight.id}
                        className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-primary/30 transition-all duration-300"
                      >
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
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-white">{insight.title}</h3>
                              <Badge variant="outline" className={getImpactColor(insight.impact)}>
                                Impacto {insight.impact}
                              </Badge>
                            </div>
                            <p className="text-sm text-white/70 mb-3">{insight.description}</p>
                            {insight.metrics && (
                              <div className="flex flex-wrap gap-2">
                                {insight.metrics.map((metric, i) => (
                                  <Badge key={i} variant="secondary" className="bg-white/10">
                                    {metric}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Action Plans Section */}
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Planes de Acción Recomendados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingActionPlans ? (
                    <Skeleton className="h-48" />
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium text-white">Plan de Optimización Q1 2025</h3>
                          <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                            Urgente
                          </Badge>
                        </div>
                        <p className="text-sm text-white/70 mb-3">
                          Implementar mejoras identificadas en procesos críticos para aumentar la eficiencia operativa.
                        </p>
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center text-sm text-white/60">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
                            Automatizar proceso de reportes
                          </div>
                          <div className="flex items-center text-sm text-white/60">
                            <Clock className="h-4 w-4 mr-2 text-yellow-400" />
                            Capacitar equipo en nuevas herramientas
                          </div>
                          <div className="flex items-center text-sm text-white/60">
                            <Clock className="h-4 w-4 mr-2 text-yellow-400" />
                            Implementar dashboard de métricas en tiempo real
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Timeline: 3 meses</span>
                          <span className="text-primary">Impacto esperado: +25% eficiencia</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Chat Interface */}
            <div className="w-1/3 border-l border-white/10 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Chat con Stratix
                </h2>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
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
                          "max-w-[80%] rounded-lg p-3",
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-white/10 backdrop-blur-sm border border-white/10'
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Analizando...</span>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-white/10">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex space-x-2"
                >
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Pregunta algo a Stratix..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                  <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}