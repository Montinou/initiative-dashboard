'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  error?: string;
}

export interface LoadingOptions {
  minDuration?: number; // Minimum loading time to prevent flashing
  showProgress?: boolean;
  message?: string;
}

// Hook for managing loading states
export function useLoadingState(initialState: boolean = false) {
  const [state, setState] = useState<LoadingState>({
    isLoading: initialState,
    progress: 0,
    message: undefined,
    error: undefined
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  const startLoading = useCallback((options?: LoadingOptions) => {
    startTimeRef.current = Date.now();
    setState({
      isLoading: true,
      progress: options?.showProgress ? 0 : undefined,
      message: options?.message,
      error: undefined
    });
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(Math.max(progress, 0), 100),
      message: message || prev.message
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message
    }));
  }, []);

  const stopLoading = useCallback((options?: LoadingOptions) => {
    const endLoading = () => {
      setState({
        isLoading: false,
        progress: undefined,
        message: undefined,
        error: undefined
      });
    };

    if (options?.minDuration && startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = options.minDuration - elapsed;
      
      if (remaining > 0) {
        timeoutRef.current = setTimeout(endLoading, remaining);
      } else {
        endLoading();
      }
    } else {
      endLoading();
    }
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startLoading,
    stopLoading,
    updateProgress,
    setMessage,
    setError
  };
}

// Hook for async operations with loading states
export function useAsyncOperation<T>() {
  const loading = useLoadingState();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: LoadingOptions
  ): Promise<{ data?: T; error?: Error }> => {
    try {
      loading.startLoading(options);
      const data = await operation();
      loading.stopLoading(options);
      return { data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      loading.setError(errorMessage);
      return { error: error as Error };
    }
  }, [loading]);

  return {
    ...loading,
    execute
  };
}

// Hook for batch operations with individual progress tracking
export function useBatchOperation<T>() {
  const [operations, setOperations] = useState<Map<string, LoadingState>>(new Map());
  const [globalProgress, setGlobalProgress] = useState(0);

  const startOperation = useCallback((id: string, message?: string) => {
    setOperations(prev => new Map(prev).set(id, {
      isLoading: true,
      progress: 0,
      message,
      error: undefined
    }));
  }, []);

  const updateOperation = useCallback((id: string, progress: number, message?: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id);
      if (current) {
        newMap.set(id, {
          ...current,
          progress,
          message: message || current.message
        });
      }
      return newMap;
    });

    // Update global progress
    const totalOps = operations.size;
    if (totalOps > 0) {
      const totalProgress = Array.from(operations.values()).reduce(
        (sum, op) => sum + (op.progress || 0), 
        0
      );
      setGlobalProgress(Math.round(totalProgress / totalOps));
    }
  }, [operations]);

  const completeOperation = useCallback((id: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id);
      if (current) {
        newMap.set(id, {
          ...current,
          isLoading: false,
          progress: 100
        });
      }
      return newMap;
    });
  }, []);

  const failOperation = useCallback((id: string, error: string) => {
    setOperations(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(id);
      if (current) {
        newMap.set(id, {
          ...current,
          isLoading: false,
          error
        });
      }
      return newMap;
    });
  }, []);

  const clearOperations = useCallback(() => {
    setOperations(new Map());
    setGlobalProgress(0);
  }, []);

  const isAnyLoading = Array.from(operations.values()).some(op => op.isLoading);
  const hasErrors = Array.from(operations.values()).some(op => op.error);

  return {
    operations,
    globalProgress,
    isAnyLoading,
    hasErrors,
    startOperation,
    updateOperation,
    completeOperation,
    failOperation,
    clearOperations
  };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);
  const loading = useLoadingState();

  const performOptimisticUpdate = useCallback(async <R,>(
    optimisticValue: T,
    operation: () => Promise<R>,
    onSuccess?: (result: R) => void,
    onError?: (error: Error) => void
  ) => {
    // Set optimistic data
    setOptimisticData(optimisticValue);
    setIsOptimistic(true);
    loading.startLoading({ message: 'Updating...' });

    try {
      const result = await operation();
      
      // Success - clear optimistic state
      setIsOptimistic(false);
      setOptimisticData(null);
      loading.stopLoading();
      
      onSuccess?.(result);
      return { data: result };
    } catch (error) {
      // Error - revert optimistic state
      setIsOptimistic(false);
      setOptimisticData(null);
      
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      loading.setError(errorMessage);
      
      onError?.(error as Error);
      return { error: error as Error };
    }
  }, [loading]);

  return {
    optimisticData,
    isOptimistic,
    isLoading: loading.isLoading,
    error: loading.error,
    performOptimisticUpdate
  };
}

// Hook for paginated loading states
export function usePaginatedLoading() {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const initialLoading = useLoadingState();

  const loadMore = useCallback(async (
    operation: (page: number) => Promise<{ data: any[]; hasMore: boolean }>
  ) => {
    if (isLoadingMore || !hasNextPage) return;

    setIsLoadingMore(true);
    
    try {
      const result = await operation(currentPage + 1);
      setCurrentPage(prev => prev + 1);
      setHasNextPage(result.hasMore);
      return { data: result.data };
    } catch (error) {
      return { error: error as Error };
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasNextPage, isLoadingMore]);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setHasNextPage(true);
    setIsLoadingMore(false);
  }, []);

  return {
    ...initialLoading,
    isLoadingMore,
    hasNextPage,
    currentPage,
    loadMore,
    reset
  };
}

// Global loading context for app-wide loading states
export function useGlobalLoading() {
  const [globalLoadingStates, setGlobalLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  const setGlobalLoading = useCallback((key: string, state: LoadingState) => {
    setGlobalLoadingStates(prev => new Map(prev).set(key, state));
  }, []);

  const clearGlobalLoading = useCallback((key: string) => {
    setGlobalLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const isAnyGlobalLoading = Array.from(globalLoadingStates.values()).some(state => state.isLoading);
  const globalErrors = Array.from(globalLoadingStates.entries())
    .filter(([_, state]) => state.error)
    .map(([key, state]) => ({ key, error: state.error! }));

  return {
    globalLoadingStates,
    isAnyGlobalLoading,
    globalErrors,
    setGlobalLoading,
    clearGlobalLoading
  };
}