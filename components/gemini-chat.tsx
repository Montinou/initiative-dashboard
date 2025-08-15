'use client';

import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
  
  // Initialize Gemini AI
  const genAI = useRef<GoogleGenerativeAI | null>(null);
  const chat = useRef<any>(null);

  // State for context data
  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Fetch context data from API
  const fetchContextData = async () => {
    try {
      setContextLoading(true);
      const response = await fetch('/api/gemini-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: 3, includeActivities: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        setContextData(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch context data:', error);
    } finally {
      setContextLoading(false);
    }
    return null;
  };

  useEffect(() => {
    // Check if API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.warn('GOOGLE_AI_API_KEY not configured');
      return;
    }

    // Initialize the AI model
    genAI.current = new GoogleGenerativeAI(apiKey);
    
    // Start a chat session with context about the user and system
    const initChat = async () => {
      try {
        // Fetch fresh context data
        const context = await fetchContextData();
        
        const model = genAI.current!.getGenerativeModel({ model: 'gemini-pro' });
        
        // Initialize chat with structured context
        const systemPrompt = `You are an AI assistant for the Initiative Dashboard system. 
          
          CONTEXT DATA (last 3 months):
          ${JSON.stringify(context, null, 2)}
          
          You help users with:
          - Understanding and managing OKRs (Objectives and Key Results)
          - Tracking initiatives and their progress
          - Managing activities and tasks
          - Analyzing performance metrics based on the provided data
          - Providing strategic planning advice
          - Answering questions about specific objectives, initiatives, or activities
          
          Use the structured context data above to provide accurate, data-driven responses.
          Reference specific IDs, names, and metrics from the context when relevant.
          Be helpful, professional, and concise. Provide actionable insights when possible.
          
          Current user: ${context?.user?.full_name || profile?.full_name || 'User'}
          Role: ${context?.user?.role || profile?.role || 'Unknown'}
          Organization: ${context?.tenant?.organization_name || 'Unknown'}`;
        
        chat.current = model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
            {
              role: 'model',
              parts: [{ text: 'I understand. I have access to your organization\'s OKR data for the last 3 months. I can help you analyze objectives, track initiatives, and provide insights based on this data.' }],
            },
            {
              role: 'user',
              parts: [{ text: 'Hello, I need help with the Initiative Dashboard.' }],
            },
            {
              role: 'model',
              parts: [{ text: `Hello ${context?.user?.full_name || profile?.full_name || 'there'}! I'm your AI assistant for the Initiative Dashboard. Based on your data, you have ${context?.summary?.total_objectives || 0} objectives, ${context?.summary?.total_initiatives || 0} initiatives, and ${context?.summary?.total_activities || 0} activities in the last 3 months. The average objective progress is ${context?.summary?.avg_objective_progress || 0}%. How can I help you today?` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
          },
        });
        
        // Set initial welcome message with context
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `Hello ${context?.user?.full_name || profile?.full_name || 'there'}! I'm your AI assistant powered by Gemini. I have access to your organization's data:\n\n📊 ${context?.summary?.total_objectives || 0} objectives\n🎯 ${context?.summary?.total_initiatives || 0} initiatives\n✅ ${context?.summary?.activities_completed || 0}/${context?.summary?.total_activities || 0} activities completed\n📈 Average progress: ${context?.summary?.avg_objective_progress || 0}%\n\nHow can I help you today?`,
            timestamp: new Date(),
          }
        ]);
      } catch (err) {
        console.error('Failed to initialize Gemini chat:', err);
        setError('Failed to initialize AI assistant');
      }
    };

    if (profile) {
      initChat();
    }
  }, [profile]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !chat.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Optionally refresh context data for important queries
      let messageWithContext = input;
      
      // Check if the user is asking about recent data or specific metrics
      const needsFreshContext = input.toLowerCase().includes('current') || 
                                input.toLowerCase().includes('latest') ||
                                input.toLowerCase().includes('recent') ||
                                input.toLowerCase().includes('today') ||
                                input.toLowerCase().includes('this week') ||
                                input.toLowerCase().includes('status');
      
      if (needsFreshContext && !contextLoading) {
        const freshContext = await fetchContextData();
        if (freshContext) {
          messageWithContext = `[UPDATED CONTEXT DATA: ${JSON.stringify(freshContext.summary)}]\n\nUser question: ${input}`;
        }
      }

      // Send message to Gemini with potential context update
      const result = await chat.current.sendMessage(messageWithContext);
      const response = await result.response;
      const text = response.text();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        timestamp: new Date(),
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

  // Don't render if no API key
  if (!process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[440px] lg:w-[540px] p-0 flex flex-col h-full bg-gray-900/95 backdrop-blur-md border-l border-white/10"
      >
        <SheetHeader className="px-6 py-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src="/gemini-logo.png" />
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Bot className="h-6 w-6 text-white" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-white">Gemini Assistant</SheetTitle>
              <SheetDescription className="text-gray-400">
                Powered by Google AI • {profile?.tenant?.name || 'Your Organization'}
              </SheetDescription>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/10"
              onClick={async () => {
                const freshContext = await fetchContextData();
                if (freshContext && chat.current) {
                  // Send context update to the chat
                  const contextUpdate = `[SYSTEM: Context data refreshed. New summary: ${JSON.stringify(freshContext.summary)}]`;
                  await chat.current.sendMessage(contextUpdate);
                }
              }}
              disabled={contextLoading}
              title="Refresh context data"
            >
              {contextLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {profile && (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {profile.role}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "group relative max-w-[85%]",
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  <Card className={cn(
                    "border-0",
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800/50 text-gray-100 border border-white/10'
                  )}>
                    <CardContent className="p-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </CardContent>
                  </Card>
                  <p className="text-xs text-gray-500 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border border-white/10">
                    <AvatarFallback className="bg-gray-700 text-white">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {/* Loading state */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 border border-white/10">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card className="bg-gray-800/50 border-white/10">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-400">Thinking...</span>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Error state */}
            {error && (
              <Card className="bg-red-900/20 border-red-500/20">
                <CardContent className="p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <Separator className="bg-white/10" />

        {/* Input Area */}
        <div className="p-4 bg-gray-900/50">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about objectives, initiatives, or metrics..."
              className="flex-1 bg-gray-800 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
              disabled={isLoading || !chat.current}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || !chat.current}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          {!chat.current && (
            <p className="text-xs text-yellow-500 mt-2">
              Initializing AI assistant...
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}