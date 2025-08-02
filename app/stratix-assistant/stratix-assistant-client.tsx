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
import { useIsMobile } from "@/hooks/use-mobile"
import { StratixErrorBoundary, StratixChatErrorBoundary } from "@/components/stratix/error-boundary"
import { ChatInterface } from "@/components/stratix/chat-interface"
import { AccessibilityProvider, AccessibilityControls, SkipLink, ScreenReaderAnnouncement } from "@/components/stratix/accessibility-enhancements"

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
  
  
  const { session } = useAuth()
  const userRole = useUserRole()
  const { userProfile } = useUserProfile()
  
  // Use the Stratix assistant hook - updated to use only real AI methods
  const {
    isLoading,
    error,
    getInitiativeProgress,
    getAreaKPIs,
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
      
      // No fallbacks - display the actual error to the user
      const errorResponse: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'AI service unavailable. No fallback available.'}`,
        timestamp: new Date()
      }

      setChatMessages(prev => prev.filter(msg => !msg.isLoading).concat(errorResponse))
    }
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
                  Solo IA Real
                </Badge>
              </div>
            </div>
            
            {/* Quick AI Query Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Consultar Iniciativa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/60 mb-3">Obtén progreso y detalles de iniciativas específicas usando IA real</p>
                  <Button 
                    onClick={() => setInputMessage("¿Cuál es el progreso de la iniciativa ")}
                    className="w-full"
                    variant="outline"
                  >
                    Preguntar sobre iniciativa
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Consultar Área
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/60 mb-3">Analiza KPIs y rendimiento de áreas organizacionales</p>
                  <Button 
                    onClick={() => setInputMessage("¿Cómo está el rendimiento del área ")}
                    className="w-full"
                    variant="outline"
                  >
                    Preguntar sobre área
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* How to Use AI Assistant */}
            <Card className="bg-slate-800/50 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Cómo usar tu Asistente Stratix</CardTitle>
              </CardHeader>
              <CardContent className="text-white/70">
                <p className="mb-3">
                  Tu asistente ahora usa únicamente IA real conectada a tus datos empresariales. 
                  No hay datos simulados ni respuestas predeterminadas.
                </p>
                <div className="space-y-2">
                  <div>• <strong>Iniciativas:</strong> "¿Cuál es el progreso de [nombre de iniciativa]?"</div>
                  <div>• <strong>Áreas:</strong> "¿Cómo están los KPIs del área [nombre de área]?"</div>
                  <div>• <strong>General:</strong> "Dame un resumen de mi empresa"</div>
                </div>
              </CardContent>
            </Card>
          </main>

          {/* Right Panel - Chat Interface */}
          <StratixChatErrorBoundary>
            <ChatInterface
              messages={chatMessages}
              inputMessage={inputMessage}
              companyContext={null}
              isAnalyzing={isLoading}
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