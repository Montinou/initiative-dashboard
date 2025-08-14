import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  onRetry: () => {},
  onMaxRetriesReached: () => {},
};

export function useNetworkRetry(options: RetryOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const retryCountRef = useRef<Map<string, number>>(new Map());

  const executeWithRetry = useCallback(
    async <T>(
      fn: () => Promise<T>,
      key: string = 'default'
    ): Promise<T> => {
      let lastError: Error | null = null;
      let currentRetryCount = retryCountRef.current.get(key) || 0;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await fn();
          // Reset retry count on success
          retryCountRef.current.set(key, 0);
          return result;
        } catch (error) {
          lastError = error as Error;
          
          // Check if it's a network error
          const isNetworkError = 
            error instanceof TypeError && error.message.includes('Failed to fetch') ||
            (error as any)?.code === 'ERR_NETWORK_CHANGED' ||
            (error as any)?.code === 'ECONNREFUSED' ||
            (error as any)?.code === 'ETIMEDOUT';

          if (!isNetworkError || attempt === config.maxRetries) {
            // Not a network error or max retries reached
            if (attempt === config.maxRetries) {
              config.onMaxRetriesReached(lastError);
            }
            throw lastError;
          }

          // Calculate delay with exponential backoff
          const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
          
          // Call retry callback
          config.onRetry(attempt + 1, lastError);
          
          // Update retry count
          currentRetryCount = attempt + 1;
          retryCountRef.current.set(key, currentRetryCount);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    },
    [config]
  );

  const resetRetryCount = useCallback((key: string = 'default') => {
    retryCountRef.current.set(key, 0);
  }, []);

  const getRetryCount = useCallback((key: string = 'default') => {
    return retryCountRef.current.get(key) || 0;
  }, []);

  return {
    executeWithRetry,
    resetRetryCount,
    getRetryCount,
  };
}

// Helper function to wrap fetch with retry logic
export function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...retryOptions };
  
  return retryFetch(url, options, config, 0);
}

async function retryFetch(
  url: string,
  options: RequestInit | undefined,
  config: Required<RetryOptions>,
  attempt: number
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Check if response is ok or if it's a server error we should retry
    if (!response.ok && response.status >= 500 && attempt < config.maxRetries) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    const isRetriableError = 
      error instanceof TypeError && error.message.includes('Failed to fetch') ||
      (error as any)?.message?.includes('Server error') ||
      (error as any)?.code === 'ERR_NETWORK_CHANGED';

    if (isRetriableError && attempt < config.maxRetries) {
      const delay = config.retryDelay * Math.pow(config.backoffMultiplier, attempt);
      config.onRetry(attempt + 1, error as Error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryFetch(url, options, config, attempt + 1);
    }
    
    if (attempt >= config.maxRetries) {
      config.onMaxRetriesReached(error as Error);
    }
    
    throw error;
  }
}