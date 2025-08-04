"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Bot, 
  MessageSquare,
  FileText,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardNavigation } from "@/components/DashboardNavigation"
import { useAuth, useUserRole } from "@/lib/auth-context"
import { useUserProfile } from "@/hooks/useUserProfile"
import { getThemeFromDomain, generateThemeCSS, CompanyTheme } from "@/lib/theme-config"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useStratixAssistant } from "@/hooks/useStratixAssistant"
import { useKPIIntegration } from "@/lib/stratix/kpi-integration"
import { useStratixWebSocket } from "@/hooks/useStratixWebSocket"
import { useIsMobile } from "@/hooks/use-mobile"
import { StratixErrorBoundary, StratixChatErrorBoundary } from "@/components/stratix/error-boundary"
import { ChatInterface } from "@/components/stratix/chat-interface"
import { FileUploadAnalyzer } from "@/components/stratix/file-upload-analyzer"
import { AdvancedInsightsPanel } from "@/components/stratix/advanced-insights-panel"
import { AccessibilityProvider, AccessibilityControls, SkipLink, ScreenReaderAnnouncement } from "@/components/stratix/accessibility-enhancements"
import { stratixDataService } from "@/lib/stratix/data-service"
import type { UserRole } from "@/lib/stratix/role-based-ai"

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
  const [companyContext, setCompanyContext] = useState<any>(null)
  const [activeView, setActiveView] = useState<'overview' | 'file-analysis' | 'insights'>('overview')
  const isMobile = useIsMobile()
  
  
  const { session } = useAuth()
  const userRole = useUserRole()
  const { userProfile } = useUserProfile()
  
  // Use the Stratix assistant hook with enhanced KPI capabilities
  const {
    isLoading,
    isProcessingFile,
    processingProgress,
    error,
    getInitiativeProgress,
    getAreaKPIs,
    chat,
    streamChat,
    processRoleBasedQuery,
    getAvailableFeatures,
    getSuggestedQueries,
    getKPIForAI,
    generateInsights,
    queryInitiativeMetrics,
    predictInitiativeSuccess,
    clearError
  } = useStratixAssistant()

  // Use KPI integration for performance optimization
  const kpiIntegration = useKPIIntegration()

  // WebSocket for real-time updates
  const {
    isConnected: wsConnected,
    connectionStatus,
    activeProcessingSessions,
    onProcessingComplete
  } = useStratixWebSocket()

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

  // Load company context and prefetch KPI data on mount
  useEffect(() => {
    if (session?.user?.id) {
      // Load company context
      stratixDataService.gatherCompanyContext(session.user.id)
        .then(context => {
          setCompanyContext(context)
          console.log('📊 Company context loaded for AI assistant')
        })
        .catch(err => {
          console.warn('⚠️ Could not load company context:', err)
        })

      // Prefetch KPI data for better performance
      if (kpiIntegration.isReady) {
        kpiIntegration.prefetchData()
          .then(() => {
            console.log('⚡ KPI data prefetched for enhanced performance')
          })
          .catch(err => {
            console.warn('⚠️ KPI prefetch failed:', err)
          })
      }
    }
  }, [session?.user?.id, kpiIntegration.isReady])

  // Handle file analysis completion
  const handleAnalysisComplete = useCallback((results: any) => {
    console.log('📄 File analysis completed:', results.fileName)
    
    // Add file analysis result to chat
    const analysisMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ Análisis completado de "${results.fileName}":\n\n` +
               `📊 KPIs encontrados: ${results.kpis?.length || 0}\n` +
               `🧠 Insights generados: ${results.insights?.length || 0}\n` +
               `🎯 Planes de acción: ${results.actionPlans?.length || 0}\n\n` +
               `Los resultados están disponibles en la pestaña "Resultados" del analizador.`,
      timestamp: new Date()
    }
    
    setChatMessages(prev => [...prev, analysisMessage])
  }, [])

  // Get role-based suggested questions
  const roleBasedSuggestions = userRole ? getSuggestedQueries(userRole as UserRole) : []
  const availableFeatures = userRole ? getAvailableFeatures(userRole as UserRole) : null

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
      // Enhanced AI processing with KPI intelligence
      console.log('🤖 Processing message with enhanced AI capabilities')
      
      // Check if this is a natural language query about metrics/KPIs
      const isKPIQuery = messageToSend.toLowerCase().includes('kpi') || 
                        messageToSend.toLowerCase().includes('metric') ||
                        messageToSend.toLowerCase().includes('rendimiento') ||
                        messageToSend.toLowerCase().includes('progreso') ||
                        messageToSend.toLowerCase().includes('analiza') ||
                        messageToSend.toLowerCase().includes('compare') ||
                        messageToSend.toLowerCase().includes('estado')

      let assistantContent = ''
      const assistantMessageId = (Date.now() + 2).toString()

      if (isKPIQuery && userProfile?.tenant_id && userRole) {
        // Use enhanced natural language querying for KPI-related questions
        try {
          console.log('🔍 Using natural language KPI querying')
          const kpiResponse = await queryInitiativeMetrics(
            userProfile.tenant_id,
            messageToSend,
            userRole,
            userProfile.area_id
          )
          
          assistantContent = kpiResponse
          
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
          
          console.log('✅ Enhanced KPI query processed successfully')
          return
          
        } catch (kpiError) {
          console.warn('⚠️ KPI query failed, falling back to standard chat:', kpiError)
        }
      }

      // Standard enhanced chat with dashboard context
      const contextualMessage = await gatherDashboardContext(messageToSend)
      
      // Use streaming chat for better UX with enhanced context
      await streamChat(
        contextualMessage,
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
      
      console.log('✅ Enhanced chat processed successfully')
      
    } catch (error) {
      console.error('❌ Enhanced chat error:', error)
      
      // Provide informative error message
      const errorResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `❌ **Error de Procesamiento**\n\n${error instanceof Error ? error.message : 'Servicio de IA temporalmente no disponible.'}\n\n💡 **Sugerencia:** Intenta reformular tu pregunta o verifica tu conexión.`,
        timestamp: new Date()
      }

      setChatMessages(prev => prev.filter(msg => !msg.isLoading).concat(errorResponse))
    }
  }

  // Function to gather enhanced dashboard context with KPI intelligence
  const gatherDashboardContext = async (userQuery: string): Promise<string> => {
    let contextData = {
      userQuery,
      timestamp: new Date().toISOString(),
      userRole: userRole,
      companyContext: companyContext,
      visibleData: {},
      kpiIntelligence: null as any
    }

    try {
      // Gather AI-optimized KPI data for enhanced context
      if (kpiIntegration.isReady && userProfile?.tenant_id && userRole) {
        try {
          console.log('📊 Gathering KPI intelligence for enhanced context')
          contextData.kpiIntelligence = await kpiIntegration.getAIKPIData('current')
          console.log('✅ KPI intelligence integrated into context')
        } catch (kpiError) {
          console.warn('⚠️ Could not gather KPI intelligence:', kpiError)
        }
      }

      // Gather visible dashboard data if user is on dashboard
      if (typeof window !== 'undefined' && window.location.pathname.includes('/dashboard')) {
        // Try to gather data from the dashboard APIs
        const tenantId = userProfile?.tenant_id
        const authToken = session?.access_token

        if (tenantId && authToken) {
          const headers = {
            'Authorization': `Bearer ${authToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          }

          try {
            // Enhanced KPI API call
            const kpiResponse = await fetch('/api/analytics/kpi?include_insights=true&include_trends=true', { headers })
            if (kpiResponse.ok) {
              contextData.visibleData['kpiAnalytics'] = await kpiResponse.json()
            }

            // Gather area comparison data
            const areaResponse = await fetch('/api/dashboard/area-comparison', { headers })
            if (areaResponse.ok) {
              contextData.visibleData['areaComparison'] = await areaResponse.json()
            }

            // Gather objectives data
            const objectivesResponse = await fetch('/api/dashboard/objectives', { headers })
            if (objectivesResponse.ok) {
              contextData.visibleData['objectives'] = await objectivesResponse.json()
            }

            // Gather status distribution
            const statusResponse = await fetch('/api/dashboard/status-distribution', { headers })
            if (statusResponse.ok) {
              contextData.visibleData['statusDistribution'] = await statusResponse.json()
            }

            // Gather progress distribution  
            const progressResponse = await fetch('/api/dashboard/progress-distribution', { headers })
            if (progressResponse.ok) {
              contextData.visibleData['progressDistribution'] = await progressResponse.json()
            }
          } catch (error) {
            console.warn('Failed to gather some dashboard data:', error)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to gather enhanced dashboard context:', error)
    }

    // Create enhanced message with KPI intelligence
    const enhancedMessage = `
USER QUERY: ${userQuery}

ENHANCED CONTEXT WITH AI INTELLIGENCE:
- User Role: ${contextData.userRole || 'Unknown'}
- Timestamp: ${contextData.timestamp}
- Page: ${typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}

${contextData.kpiIntelligence ? `
KPI INTELLIGENCE SUMMARY:
- Overall Health: ${contextData.kpiIntelligence.summary.overall_health} (${contextData.kpiIntelligence.summary.performance_score}% performance)
- Risk Level: ${contextData.kpiIntelligence.summary.risk_level}
- Trend Direction: ${contextData.kpiIntelligence.summary.trend_direction}
- Efficiency Rating: ${contextData.kpiIntelligence.summary.efficiency_rating}%
- Company Stage: ${contextData.kpiIntelligence.context.company_stage}
- Primary Focus: ${contextData.kpiIntelligence.context.primary_focus.join(', ')}
- Current Challenges: ${contextData.kpiIntelligence.context.current_challenges.join(', ')}

${contextData.kpiIntelligence.area_focus ? `
AREA FOCUS (${contextData.kpiIntelligence.area_focus.area_name}):
- Performance vs Company: ${contextData.kpiIntelligence.area_focus.performance_vs_company}
- Key Challenges: ${contextData.kpiIntelligence.area_focus.key_challenges.join(', ')}
- Opportunities: ${contextData.kpiIntelligence.area_focus.opportunities.join(', ')}
` : ''}
` : 'KPI Intelligence: Not available'}

LIVE DASHBOARD DATA:
${Object.keys(contextData.visibleData).length > 0 
  ? JSON.stringify(contextData.visibleData, null, 2)
  : 'No dashboard data currently visible'
}

COMPANY CONTEXT:
${contextData.companyContext 
  ? JSON.stringify(contextData.companyContext, null, 2)
  : 'Company context not available'
}

INSTRUCTIONS:
- Use the KPI Intelligence summary to provide contextual and data-driven responses
- Reference specific metrics and trends when relevant to the user query
- Provide actionable insights based on the enhanced context
- Format responses professionally with clear structure and bullet points
- Focus on insights specific to the user's role (${contextData.userRole})

Please respond to the user query considering all the above enhanced context and intelligence.
`

    return enhancedMessage
  }


  return (
    <AccessibilityProvider>
      <StratixErrorBoundary>
        <SkipLink targetId="main-content">Saltar al contenido principal</SkipLink>
        <SkipLink targetId="chat-interface">Saltar al chat</SkipLink>
        
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
              <AccessibilityControls />
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                <Bot className="h-3 w-3 mr-1" />
                AI Enabled
              </Badge>
              {wsConnected && (
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                  WebSocket Conectado
                </Badge>
              )}
              {isLoading && (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Bot className="h-3 w-3 mr-1 animate-pulse" />
                  Procesando...
                </Badge>
              )}
              {error && (
                <Badge 
                  variant="outline" 
                  className="bg-red-500/20 text-red-400 border-red-500/30 cursor-pointer hover:bg-red-500/30" 
                  onClick={clearError}
                >
                  <Bot className="h-3 w-3 mr-1" />
                  Error - Clic para limpiar
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
          <main 
            id="main-content"
            role="main"
            aria-label="Panel principal con KPIs e insights"
            className={cn(
              "p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-6 transition-all duration-300",
              isMobile ? (isChatVisible ? "hidden" : "w-full") : "w-2/3"
            )}
          >
            
            {/* AI-Powered Query Interface */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Asistente Stratix</h1>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Bot className="h-3 w-3 mr-1" />
                  IA Avanzada
                </Badge>
                {userRole && (
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Rol: {userRole}
                  </Badge>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="flex space-x-2">
                <Button
                  variant={activeView === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('overview')}
                  className="text-white/80 hover:text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Consultas
                </Button>
                <Button
                  variant={activeView === 'file-analysis' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('file-analysis')}
                  className="text-white/80 hover:text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Análisis de Archivos
                </Button>
                <Button
                  variant={activeView === 'insights' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('insights')}
                  className="text-white/80 hover:text-white"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Insights Avanzados
                </Button>
              </div>
            </div>
            
            {/* Conditional Content Based on Active View */}
            {activeView === 'overview' && (
              <>
                {/* Role-based Features */}
                {availableFeatures && (
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 mb-6">
                    <CardHeader>
                      <CardTitle className="text-white">Capacidades para tu Rol ({userRole})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-white/80 font-medium mb-2">Funciones Disponibles:</h4>
                          <ul className="text-white/60 text-sm space-y-1">
                            {availableFeatures.features.map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle2 className="h-3 w-3 text-green-400 mr-2" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white/80 font-medium mb-2">Tipos de Análisis:</h4>
                          <div className="flex flex-wrap gap-2">
                            {availableFeatures.analysisTypes.map((type, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Enhanced Role-based Quick AI Query Cards with KPI Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {roleBasedSuggestions.slice(0, 4).map((suggestion, index) => (
                    <Card key={index} className="bg-slate-800/50 backdrop-blur-xl border-white/10 hover:bg-slate-800/70 transition-colors">
                      <CardContent className="p-4">
                        <p className="text-white/80 mb-3 text-sm leading-relaxed">{suggestion}</p>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => setInputMessage(suggestion)}
                            className="flex-1"
                            variant="outline"
                            size="sm"
                          >
                            <Bot className="h-3 w-3 mr-2" />
                            Preguntar
                          </Button>
                          {/* Add smart action button for certain suggestions */}
                          {(suggestion.includes('analiza') || suggestion.includes('rendimiento') || suggestion.includes('KPI')) && (
                            <Button 
                              onClick={async () => {
                                if (userProfile?.tenant_id && userRole) {
                                  try {
                                    const kpiData = await getKPIForAI(userProfile.tenant_id, userRole, userProfile.area_id)
                                    const insights = await generateInsights(kpiData)
                                    
                                    const smartResponse = `📊 **Análisis Inteligente Rápido** (${userRole})\n\n` +
                                      `**Estado General:** ${kpiData.summary.overall_health} (${kpiData.summary.performance_score}% rendimiento)\n` +
                                      `**Nivel de Riesgo:** ${kpiData.summary.risk_level}\n` +
                                      `**Tendencia:** ${kpiData.summary.trend_direction}\n\n` +
                                      `**Insights Principales:**\n${insights.slice(0, 3).map(insight => `• ${insight.title}: ${insight.description}`).join('\n')}`
                                    
                                    const smartMessage = {
                                      id: Date.now().toString(),
                                      role: 'assistant' as const,
                                      content: smartResponse,
                                      timestamp: new Date()
                                    }
                                    
                                    setChatMessages(prev => [...prev, smartMessage])
                                  } catch (error) {
                                    console.error('Smart analysis failed:', error)
                                  }
                                }
                              }}
                              variant="ghost"
                              size="sm"
                              className="px-3"
                              title="Análisis inteligente instantáneo"
                            >
                              ⚡
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Processing Status */}
                {isProcessingFile && (
                  <Card className="bg-blue-500/10 border border-blue-500/20 mb-6">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-400 flex items-center">
                          <Bot className="h-4 w-4 mr-2 animate-pulse" />
                          Procesando archivos con IA...
                        </span>
                        <span className="text-blue-400 text-sm">{processingProgress}%</span>
                      </div>
                      {processingProgress > 0 && (
                        <div className="w-full bg-blue-900/20 rounded-full h-2">
                          <div 
                            className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Active Processing Sessions */}
                {activeProcessingSessions.size > 0 && (
                  <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10 mb-6">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Bot className="h-5 w-5 mr-2 animate-pulse" />
                        Procesamiento en Tiempo Real ({activeProcessingSessions.size})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Array.from(activeProcessingSessions.values()).map((session) => (
                          <div key={session.sessionId} className="bg-slate-700/50 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white/90 text-sm font-medium">{session.fileName}</span>
                              <Badge 
                                variant="outline" 
                                className={
                                  session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                  session.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                  session.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }
                              >
                                {session.status}
                              </Badge>
                            </div>
                            <div className="text-white/60 text-xs mb-2">{session.currentStep}</div>
                            <div className="w-full bg-slate-600 rounded-full h-1">
                              <div 
                                className="bg-primary h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${session.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* How to Use AI Assistant */}
                <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Tu Asistente Stratix Avanzado</CardTitle>
                  </CardHeader>
                  <CardContent className="text-white/70">
                    <p className="mb-3">
                      Asistente de IA empresarial con análisis de documentos, insights contextuales y capacidades específicas por rol.
                    </p>
                    <div className="space-y-2">
                      <div>• <strong>Consultas Inteligentes:</strong> Análisis contextual basado en tu rol y permisos</div>
                      <div>• <strong>Análisis de Documentos:</strong> Sube archivos para obtener KPIs, insights y planes de acción</div>
                      <div>• <strong>Actualizaciones en Tiempo Real:</strong> Seguimiento en vivo del procesamiento de IA</div>
                      <div>• <strong>Seguridad por Roles:</strong> Acceso controlado a información según tu nivel</div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeView === 'file-analysis' && (
              <FileUploadAnalyzer 
                onAnalysisComplete={handleAnalysisComplete}
                className="mb-6"
              />
            )}

            {activeView === 'insights' && (
              <AdvancedInsightsPanel
                userRole={userRole as UserRole}
                companyContext={companyContext}
                className="mb-6"
              />
            )}
          </main>

          {/* Right Panel - Chat Interface */}
          <StratixChatErrorBoundary>
            <ChatInterface
              messages={chatMessages}
              inputMessage={inputMessage}
              companyContext={companyContext}
              isAnalyzing={isLoading || isProcessingFile}
              showSuggestions={showSuggestions}
              isVisible={isChatVisible}
              isMobile={isMobile}
              onInputChange={setInputMessage}
              onSendMessage={() => {
                handleSendMessage()
                setShowSuggestions(false)
              }}
              onSuggestionClick={(question) => {
                setInputMessage(question)
                setShowSuggestions(false)
              }}
              onToggleVisibility={() => setIsChatVisible(false)}
            />
          </StratixChatErrorBoundary>
        </div>
      </div>
      
      {/* Screen reader announcements for dynamic content */}
      {error && (
        <ScreenReaderAnnouncement 
          message={`Error: ${error}`} 
          priority="assertive" 
        />
      )}
      {isLoading && (
        <ScreenReaderAnnouncement 
          message="Procesando consulta con IA..." 
          priority="polite" 
        />
      )}
    </div>
    </StratixErrorBoundary>
    </AccessibilityProvider>
  )
}