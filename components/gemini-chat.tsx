'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function GeminiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  
  // State for context data
  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch context data from API
  const fetchContextData = async () => {
    try {
      setContextLoading(true);
      const response = await fetch('/api/gemini-context', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ months: 3, includeActivities: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        setContextData(data);
        return data;
      } else {
        console.error('Failed to fetch context data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch context data:', error);
    } finally {
      setContextLoading(false);
    }
    return null;
  };

  // Initialize chat with context
  const initializeChat = async () => {
    if (!profile || !profile.tenant_id || isInitialized) {
      return;
    }

    try {
      const context = await fetchContextData();
      
      if (context) {
        // Set initial welcome message
        const welcomeMessage: Message = {
          id: '1',
          role: 'assistant',
          content: `¡Hola ${context?.user?.full_name || profile?.full_name || 'CEO'}! Soy tu asistente de IA para el Dashboard de Iniciativas. 

Basándome en tus datos de los últimos 3 meses:
• ${context?.summary?.total_objectives || 0} objetivos con ${context?.summary?.avg_objective_progress || 0}% de progreso promedio
• ${context?.summary?.total_initiatives || 0} iniciativas con ${context?.summary?.avg_initiative_progress || 0}% de progreso promedio
• ${context?.summary?.total_activities || 0} actividades con ${context?.summary?.activities_completion_rate || 0}% de tasa de completitud

¿En qué puedo ayudarte hoy?`,
          timestamp: new Date()
        };
        
        setMessages([welcomeMessage]);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Error al inicializar el chat. Por favor, intenta de nuevo.');
    }
  };

  useEffect(() => {
    if (isOpen && !isInitialized && profile?.tenant_id) {
      initializeChat();
    }
  }, [isOpen, profile, isInitialized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Send message to server-side API
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message: input,
          context: contextData,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp)
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to send message. Please try again.');
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Lo siento, pero encontré un error: ${error.message}. Por favor, intenta de nuevo.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    setMessages([]);
    setError(null);
    setIsInitialized(false);
    // Re-initialize with fresh context
    await initializeChat();
  };

  const handleRefreshContext = async () => {
    setContextLoading(true);
    const newContext = await fetchContextData();
    if (newContext) {
      setContextData(newContext);
      // Add a system message about refreshed context
      const refreshMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Los datos del contexto han sido actualizados con la información más reciente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, refreshMessage]);
    }
    setContextLoading(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-[9998] bg-gradient-to-r from-blue-500 to-purple-600 border-0 hover:from-blue-600 hover:to-purple-700"
        >
          <MessageCircle className="h-5 w-5 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Asistente IA
            <Badge variant="outline" className="ml-2">Gemini</Badge>
          </SheetTitle>
          <SheetDescription>
            Pregúntame sobre tus objetivos, iniciativas y métricas de rendimiento
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex flex-col h-[calc(100vh-180px)] mt-4">
          {/* Context status bar */}
          <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={contextData ? "default" : "secondary"} className="text-xs">
                {contextLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Cargando contexto...
                  </>
                ) : contextData ? (
                  'Contexto cargado'
                ) : (
                  'Sin contexto'
                )}
              </Badge>
              {contextData && (
                <span className="text-xs text-muted-foreground">
                  {contextData.summary?.total_objectives || 0} objetivos
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleRefreshContext}
                disabled={contextLoading}
              >
                <RefreshCw className={cn("h-3 w-3", contextLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClearChat}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3 py-2 max-w-[80%]",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error display */}
          {error && (
            <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Input area */}
          <div className="mt-4 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta sobre tus OKRs..."
              disabled={isLoading || !isInitialized}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !isInitialized}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}