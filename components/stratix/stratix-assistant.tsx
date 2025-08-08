'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  BarChart3, 
  Target, 
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    hasData?: boolean;
    dataType?: string;
    metrics?: any;
  };
}

interface StratixAssistantProps {
  className?: string;
  embedded?: boolean;
  userProfile?: {
    name?: string;
    role?: string;
    area?: string;
  };
}

export function StratixAssistant({ className, embedded = false, userProfile }: StratixAssistantProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 Welcome${userProfile?.name ? ` ${userProfile.name}` : ''}! I'm your AI assistant for the Initiative Dashboard.

I can help you with:
- 📊 **Performance Analysis**: Review progress on initiatives and objectives
- 🎯 **Strategic Insights**: Identify trends and opportunities
- 📈 **Metrics & KPIs**: Track key performance indicators
- 🔍 **Data Exploration**: Query specific information about your organization
- 💡 **Recommendations**: Get actionable suggestions for improvement

How can I assist you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [userProfile?.name, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Determine endpoint based on authentication status
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
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process complete chunks
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                // Parse streaming format
                if (line.startsWith('0:')) {
                  const content = line.slice(2).trim();
                  if (content && content !== '""') {
                    const parsedContent = content.replace(/^"|"$/g, '');
                    assistantMessage.content += parsedContent;
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessage.id 
                          ? { ...m, content: assistantMessage.content }
                          : m
                      )
                    );
                  }
                } else if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data !== '[DONE]') {
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.choices?.[0]?.delta?.content) {
                        assistantMessage.content += parsed.choices[0].delta.content;
                        setMessages(prev => 
                          prev.map(m => 
                            m.id === assistantMessage.id 
                              ? { ...m, content: assistantMessage.content }
                              : m
                          )
                        );
                      }
                    } catch {
                      // Skip invalid JSON
                    }
                  }
                }
              } catch (e) {
                console.error('Error processing chunk:', e);
              }
            }
          }
        }
      }

      // Detect if response contains data/metrics
      if (assistantMessage.content.includes('##') || assistantMessage.content.includes('**')) {
        assistantMessage.metadata = { hasData: true };
      }

    } catch (error) {
      console.error('Chat error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `⚠️ ${error instanceof Error ? error.message : 'Failed to connect to the assistant'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    { icon: BarChart3, text: "Show me the overall progress of our initiatives" },
    { icon: Target, text: "What are our top performing objectives?" },
    { icon: Activity, text: "List activities that need attention" },
    { icon: TrendingUp, text: "Analyze performance trends this quarter" },
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const renderMessage = (message: Message) => {
    if (message.role === 'user') {
      return (
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">
              {userProfile?.name || 'You'}
            </div>
            <div className="bg-muted rounded-lg px-4 py-2 inline-block">
              {message.content}
            </div>
          </div>
        </div>
      );
    }

    if (message.role === 'assistant') {
      return (
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">AI Assistant</div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium mt-2 mb-1">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
                  li: ({ children }) => <li className="my-1">{children}</li>,
                  p: ({ children }) => <p className="my-2">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      );
    }

    if (message.role === 'system') {
      return (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          {message.content}
        </div>
      );
    }

    return null;
  };

  if (embedded) {
    return (
      <Card className={cn("flex flex-col h-[600px]", className)}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by Gemini 2.0</p>
            </div>
          </div>
          {userProfile && (
            <div className="text-xs text-muted-foreground text-right">
              <div>{userProfile.role}</div>
              {userProfile.area && <div>{userProfile.area}</div>}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.map(message => (
            <div key={message.id}>
              {renderMessage(message)}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI is thinking...
            </div>
          )}
        </ScrollArea>

        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <div className="text-xs text-muted-foreground mb-2">Suggested questions:</div>
            <div className="grid grid-cols-2 gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => handleSuggestedQuestion(q.text)}
                >
                  <q.icon className="w-3 h-3 mr-1" />
                  <span className="truncate">{q.text}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about initiatives, objectives, or performance..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg",
            "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700",
            className
          )}
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-96 h-[600px] flex flex-col shadow-xl z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Powered by Gemini 2.0</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            {messages.map(message => (
              <div key={message.id}>
                {renderMessage(message)}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                AI is thinking...
              </div>
            )}
          </ScrollArea>

          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <div className="text-xs text-muted-foreground mb-2">Suggested questions:</div>
              <div className="space-y-1">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handleSuggestedQuestion(q.text)}
                  >
                    <q.icon className="w-3 h-3 mr-2" />
                    {q.text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about initiatives, objectives, or performance..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}