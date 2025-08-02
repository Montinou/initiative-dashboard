"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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

  const refreshInsights = useCallback(() => {
    refreshContext()
  }, [refreshContext])

  const createActionPlan = useCallback((planName?: string) => {
    console.log('Creating action plan:', planName)
    // TODO: Implement action plan creation
  }, [])

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {theme && (
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      )}
      
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
              {isLoadingContext && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Sincronizando datos...
                </Badge>
              )}
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
            
            {/* Company Context Summary */}
            {companyContext && (
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Contexto de la Empresa
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshContext} 
                      className="text-primary"
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      Actualizar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-green-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Iniciativas</div>
                        <Target className="h-4 w-4 text-green-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{companyContext.company.totalInitiatives}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-green-400 font-medium">{companyContext.company.activeInitiatives} activas</div>
                        <div className="text-xs text-white/50">{companyContext.company.completedInitiatives} completadas</div>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-blue-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Áreas</div>
                        <Users className="h-4 w-4 text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{companyContext.company.totalAreas}</div>
                      <div className="text-xs text-blue-400 font-medium">organizacionales</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-purple-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Presupuesto</div>
                        <BarChart3 className="h-4 w-4 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">${(companyContext.company.activeBudget / 1000).toFixed(0)}k</div>
                      <div className="text-xs text-purple-400 font-medium">asignado</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:border-cyan-500/30 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-white/60 font-medium uppercase tracking-wide">Usuarios</div>
                        <Users className="h-4 w-4 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{companyContext.company.totalUsers}</div>
                      <div className="text-xs text-cyan-400 font-medium">registrados</div>
                    </div>
                  </div>
                  
                  {/* Quick Context Actions */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setInputMessage("¿Cuáles son las iniciativas más importantes?")}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        Iniciativas Clave
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setInputMessage("¿Cómo está el presupuesto?")}
                      >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Análisis Presupuesto
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs text-white/70 hover:text-white hover:bg-white/10"
                        onClick={() => setInputMessage("¿Qué áreas necesitan atención?")}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Áreas de Riesgo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs Section */}
            <Card className="glassmorphic-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    KPIs Principales
                    {kpis.filter(kpi => kpi.priority === 'high').length > 0 && (
                      <Badge 
                        variant="outline" 
                        className="ml-2 border-red-500/50 text-red-400 bg-red-500/10"
                      >
                        {kpis.filter(kpi => kpi.priority === 'high').length} Críticos
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshContext}
                      className="text-white/70 hover:text-white"
                    >
                      <Bot className="h-4 w-4 mr-1" />
                      Actualizar
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingKPIs ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-pulse">
                        <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-white/20 rounded w-1/2 mb-2"></div>
                        <div className="flex justify-between items-center">
                          <div className="h-6 bg-white/20 rounded w-16"></div>
                          <div className="h-4 bg-white/20 rounded w-8"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Error al cargar KPIs</h3>
                    <p className="text-white/70 mb-4">{error}</p>
                    <Button onClick={refreshContext} className="bg-primary">
                      <Bot className="h-4 w-4 mr-2" />
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {kpis.map((kpi, index) => (
                      <div
                        key={index}
                        className={cn(
                          "bg-white/5 backdrop-blur-sm rounded-lg p-4 border transition-all duration-300",
                          kpi.priority === 'high' ? 'border-red-500/30 hover:border-red-500/50' :
                          kpi.priority === 'medium' ? 'border-yellow-500/30 hover:border-yellow-500/50' :
                          'border-white/10 hover:border-primary/30'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div 
                              className={cn(
                                "w-2 h-2 rounded-full",
                                kpi.priority === 'high' ? 'bg-red-400' :
                                kpi.priority === 'medium' ? 'bg-yellow-400' :
                                'bg-green-400'
                              )} 
                            />
                            <span className="text-xs font-medium text-white/70 uppercase tracking-wide">{kpi.category || 'Métrica'}</span>
                          </div>
                          <Badge variant="outline" className={cn(
                            "text-xs px-2 py-0.5",
                            kpi.priority === 'high' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 
                            kpi.priority === 'medium' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 
                            'border-green-500/50 text-green-400 bg-green-500/10'
                          )}>
                            {kpi.priority}
                          </Badge>
                        </div>
                        
                        <div className="mb-2">
                          <h3 className="text-sm font-medium text-white/90 mb-1">{kpi.name}</h3>
                          {kpi.description && (
                            <p className="text-xs text-white/60">{kpi.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-baseline justify-between">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-bold text-white">{kpi.value}</span>
                            {kpi.target && (
                              <span className="text-xs text-white/50">/ {kpi.target}</span>
                            )}
                          </div>
                          <div className={cn(
                            "flex items-center text-sm font-medium px-2 py-1 rounded-md",
                            kpi.trend === 'up' ? 'text-green-400 bg-green-500/10' : 
                            kpi.trend === 'down' ? 'text-red-400 bg-red-500/10' : 
                            'text-gray-400 bg-gray-500/10'
                          )}>
                            {kpi.trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : 
                             kpi.trend === 'down' ? <ArrowDown className="h-3 w-3 mr-1" /> : 
                             <span className="w-3 h-3 mr-1 flex items-center justify-center">—</span>}
                            {Math.abs(kpi.trendValue)}%
                          </div>
                        </div>
                        
                        {kpi.priority === 'high' && (
                          <div className="mt-3 pt-2 border-t border-white/10">
                            <span className="text-xs text-red-400 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Requiere atención
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insights Section */}
            <Card className="glassmorphic-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Insights y Recomendaciones
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingInsights ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-pulse">
                      <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-white/20 rounded w-1/2"></div>
                    </div>
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
              {/* Context indicators */}
              {companyContext && (
                <div className="flex items-center space-x-2 text-xs text-white/60 mb-3">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span>Datos reales conectados</span>
                  </div>
                  <span>•</span>
                  <span>{companyContext.company.totalInitiatives} iniciativas</span>
                  <span>•</span>
                  <span>{companyContext.company.totalAreas} áreas</span>
                </div>
              )}
              
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
  )
}