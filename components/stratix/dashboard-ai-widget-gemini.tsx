'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bot, Send, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGeminiAssistant } from '@/hooks/useGeminiAssistant'
import ReactMarkdown from 'react-markdown'

interface DashboardAIWidgetGeminiProps {
  className?: string
  position?: 'sidebar' | 'top' | 'bottom' | 'floating'
  minimized?: boolean
  onMinimize?: (minimized: boolean) => void
}

export function DashboardAIWidgetGemini({
  className,
  position = 'sidebar',
  minimized = false,
  onMinimize
}: DashboardAIWidgetGeminiProps) {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isLoading } = useGeminiAssistant({ endpoint: '/api/stratix/chat' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    sendMessage(input)
    setInput('')
  }

  const suggestedQuestions = [
    "¿Cuál es el estado general de nuestros OKRs?",
    "¿Qué iniciativas necesitan atención urgente?",
    "¿Cómo está el progreso de mi área?",
    "¿Cuáles son las tendencias de rendimiento?"
  ]

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  if (minimized) {
    return (
      <Card className={cn(
        "bg-gradient-to-br from-slate-800/50 to-purple-900/30 backdrop-blur-xl border-white/10 transition-all duration-300",
        position === 'floating' && "fixed bottom-4 right-4 z-50",
        className
      )}>
        <CardContent className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMinimize?.(false)}
            className="w-full flex items-center justify-center text-white/70 hover:text-white"
          >
            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
            AI Assistant
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br from-slate-800/50 to-purple-900/30 backdrop-blur-xl border-white/10 transition-all duration-300",
      position === 'floating' && "fixed bottom-4 right-4 z-50 w-96",
      position === 'sidebar' && "w-full",
      className
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-purple-400" />
            AI Assistant
          </CardTitle>
          {onMinimize && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMinimize(true)}
              className="text-white/70 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <p className="text-white/80 mb-6">
                  Hola, soy tu asistente de IA. Puedo ayudarte con análisis de OKRs, 
                  seguimiento de iniciativas y insights estratégicos.
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-white/60 text-sm mb-2">Preguntas sugeridas:</p>
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-sm text-white/80"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-lg p-3",
                    message.role === 'user' 
                      ? "bg-purple-600/20 ml-8" 
                      : "bg-white/5 mr-8"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Sparkles className="h-4 w-4 text-purple-400 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 text-white/90 text-sm">
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-purple-400">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse animation-delay-200">●</div>
                  <div className="animate-pulse animation-delay-400">●</div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre tus OKRs..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}