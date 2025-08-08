'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Send, 
  Loader2, 
  MessageSquare,
  Sparkles,
  X,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface StratixAssistantClientProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
  position?: 'sidebar' | 'floating' | 'embedded'
  isMobile?: boolean
}

export function StratixAssistantClient({
  className,
  isOpen = true,
  onClose,
  position = 'sidebar',
  isMobile = false
}: StratixAssistantClientProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  const suggestedQuestions = [
    "¿Cuáles son las iniciativas más críticas en este momento?",
    "¿Qué áreas necesitan más atención?",
    "¿Cómo está el progreso general de los objetivos?",
    "¿Qué actividades están retrasadas?",
    "Dame un resumen del estado actual del dashboard"
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)
    setShowSuggestions(false)

    try {
      // Use test endpoint if in test mode
      const endpoint = window.location.pathname.includes('/test-ai') 
        ? '/api/stratix/chat/test' 
        : '/api/stratix/chat';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Read the streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      // Create assistant message placeholder
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        
        // Parse streaming chunks (Vercel AI SDK format)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            // This is a text chunk
            const content = line.slice(2).replace(/^"|"$/g, '')
            if (content && content !== '\n') {
              assistantMessage += content
              setMessages(prev => {
                const newMessages = [...prev]
                const lastMessage = newMessages[newMessages.length - 1]
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = assistantMessage
                }
                return newMessages
              })
            }
          }
        }
      }

    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.filter(m => m.content !== ''))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    setShowSuggestions(false)
    // Auto-submit
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement
      form?.requestSubmit()
    }, 100)
  }

  if (!isOpen && position === 'floating') {
    return (
      <Button
        onClick={() => onClose?.()}
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        size="lg"
      >
        <Bot className="h-5 w-5 mr-2" />
        Asistente IA
      </Button>
    )
  }

  return (
    <Card className={cn(
      "flex flex-col",
      position === 'floating' && "fixed bottom-4 right-4 z-50 w-96 h-[600px] shadow-2xl",
      position === 'sidebar' && "h-full",
      position === 'embedded' && "w-full h-[500px]",
      isMobile && "fixed inset-0 z-50",
      className
    )}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            Asistente Gemini
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  ¡Hola! Soy tu asistente de IA
                </h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Puedo ayudarte a analizar tus objetivos, iniciativas y actividades.
                  ¿En qué puedo asistirte hoy?
                </p>
              </div>
            )}

            {/* Suggested questions */}
            {messages.length === 0 && showSuggestions && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Preguntas sugeridas:
                </p>
                <div className="grid gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="text-left justify-start h-auto py-2 px-3"
                      onClick={() => handleSuggestionClick(question)}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
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
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  )}
                >
                  <div className="flex items-center mb-1">
                    {message.role === 'assistant' ? (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        <span className="text-xs font-medium">Gemini</span>
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" />
                        <span className="text-xs font-medium">Tú</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center">
                    <Bot className="h-4 w-4 mr-2" />
                    <span className="text-xs font-medium">Gemini</span>
                  </div>
                  <div className="flex items-center mt-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  Error: {error}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input form */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta aquí..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          {/* Status indicator */}
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Conectado con Gemini 2.0 Flash
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}