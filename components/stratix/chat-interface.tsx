'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Bot, 
  Sparkles, 
  MessageSquare, 
  Loader2, 
  X 
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyContext } from '@/lib/stratix/data-service'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
}

interface ChatInterfaceProps {
  messages: ChatMessage[]
  inputMessage: string
  companyContext: CompanyContext | null
  isAnalyzing: boolean
  showSuggestions: boolean
  isVisible: boolean
  isMobile: boolean
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onSuggestionClick: (question: string) => void
  onToggleVisibility: () => void
}

export function ChatInterface({
  messages,
  inputMessage,
  companyContext,
  isAnalyzing,
  showSuggestions,
  isVisible,
  isMobile,
  onInputChange,
  onSendMessage,
  onSuggestionClick,
  onToggleVisibility
}: ChatInterfaceProps) {
  const suggestedQuestions = [
    "¿Cuáles son las iniciativas más críticas?",
    "¿Qué áreas necesitan más atención?",
    "¿Cómo puedo mejorar la eficiencia presupuestaria?",
    "¿Qué oportunidades de automatización existen?"
  ]

  return (
    <aside className={cn(
      "border-l border-border flex flex-col transition-all duration-300",
      isMobile ? (isVisible ? "fixed inset-0 z-40 bg-background/95 backdrop-blur-xl" : "hidden") : "w-1/3"
    )}>
      <ChatHeader isMobile={isMobile} onClose={onToggleVisibility} />
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Suggested questions */}
          {messages.length === 1 && showSuggestions && (
            <SuggestedQuestions 
              questions={suggestedQuestions}
              onQuestionClick={onSuggestionClick}
            />
          )}
          
          {/* Chat messages */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <ChatInput
        inputMessage={inputMessage}
        companyContext={companyContext}
        isAnalyzing={isAnalyzing}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
      />
    </aside>
  )
}

interface ChatHeaderProps {
  isMobile: boolean
  onClose: () => void
}

function ChatHeader({ isMobile, onClose }: ChatHeaderProps) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h2 className="text-lg font-semibold text-foreground flex items-center">
        <MessageSquare className="h-5 w-5 mr-2" />
        Chat con Stratix
      </h2>
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

interface SuggestedQuestionsProps {
  questions: string[]
  onQuestionClick: (question: string) => void
}

function SuggestedQuestions({ questions, onQuestionClick }: SuggestedQuestionsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">Preguntas sugeridas:</p>
      <div className="grid gap-2">
        {questions.map((question, index) => (
          <Button
            key={index}
            variant="ghost"
            className="text-left h-auto p-3 text-muted-foreground hover:text-foreground hover:bg-accent border border-border rounded-lg text-sm"
            onClick={() => onQuestionClick(question)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {question}
          </Button>
        ))}
      </div>
    </div>
  )
}

interface ChatMessageProps {
  message: ChatMessage
}

function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
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
            : 'bg-card border border-border text-card-foreground'
        )}
      >
        {message.role === 'assistant' && (
          <div className="flex items-center mb-2">
            <Bot className="h-4 w-4 text-primary mr-2" />
            <span className="text-xs text-muted-foreground font-medium">Stratix</span>
          </div>
        )}
        {message.isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">Analizando...</span>
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

interface ChatInputProps {
  inputMessage: string
  companyContext: CompanyContext | null
  isAnalyzing: boolean
  onInputChange: (value: string) => void
  onSendMessage: () => void
}

function ChatInput({ 
  inputMessage, 
  companyContext, 
  isAnalyzing, 
  onInputChange, 
  onSendMessage 
}: ChatInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage()
    }
  }

  return (
    <div className="p-4 border-t border-white/10">
      {/* Context indicators */}
      {companyContext && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span>Datos reales conectados</span>
          </div>
          <span>•</span>
          <span>{companyContext.company.totalInitiatives} iniciativas</span>
          <span>•</span>
          <span>{companyContext.company.totalAreas} áreas</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Pregunta sobre tus KPIs, iniciativas o áreas..."
          className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
          disabled={isAnalyzing}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="disabled:opacity-50" 
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
  )
}