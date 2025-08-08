import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UseGeminiAssistantOptions {
  endpoint?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export function useGeminiAssistant(options: UseGeminiAssistantOptions = {}) {
  const { 
    endpoint = '/api/stratix/chat',
    maxRetries = 3,
    retryDelay = 1000 
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    let retries = 0;
    let assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    while (retries < maxRetries) {
      try {
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
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Authentication required. Please log in to use the assistant.');
          }
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        // Add assistant message to state
        setMessages(prev => [...prev, assistantMessage]);

        // Process streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  // Handle different streaming formats
                  if (line.startsWith('0:')) {
                    // Vercel AI SDK format
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
                    // SSE format
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
                  } else {
                    // Plain text format
                    assistantMessage.content += line;
                    setMessages(prev => 
                      prev.map(m => 
                        m.id === assistantMessage.id 
                          ? { ...m, content: assistantMessage.content }
                          : m
                      )
                    );
                  }
                } catch (e) {
                  console.error('Error processing chunk:', e);
                }
              }
            }
          }
        }

        // Success - break retry loop
        break;

      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            // Request was cancelled
            console.log('Request cancelled');
            break;
          }

          console.error(`Attempt ${retries + 1} failed:`, error);
          
          if (retries === maxRetries - 1) {
            // Final retry failed
            setError(error.message);
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              role: 'system',
              content: `⚠️ ${error.message}`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay * (retries + 1)));
            retries++;
          }
        }
      }
    }

    setIsLoading(false);
    abortControllerRef.current = null;
  }, [messages, endpoint, maxRetries, retryDelay]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const addSystemMessage = useCallback((content: string) => {
    const systemMessage: Message = {
      id: `system-${Date.now()}`,
      role: 'system',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    cancelRequest,
    addSystemMessage,
  };
}