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

export function useGeminiAssistant(_: UseGeminiAssistantOptions = {}) {
  throw new Error('useGeminiAssistant has been deprecated. Use DialogflowChatWidget instead.');
}