/**
 * Component Lazy Loading System for Performance Optimization
 * 
 * Implements intelligent lazy loading for large forms and components:
 * - Lazy loading with suspense boundaries
 * - Progressive loading based on viewport
 * - Memory-efficient component management
 * - Loading state management
 * - Error boundaries for failed loads
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-001 Performance Optimization
 */

import React, { Suspense, lazy, ComponentType, ReactNode, useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';

// Lazy loading configuration
const LAZY_LOADING_CONFIG = {
  // Intersection observer options
  INTERSECTION_OPTIONS: {
    root: null,
    rootMargin: '50px', // Start loading 50px before element is visible
    threshold: 0.1,
  },
  // Retry configuration for failed loads
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },
  // Preload configuration
  PRELOAD: {
    ENABLED: true,
    IDLE_TIMEOUT: 2000, // Preload after 2 seconds of idle time
  },
} as const;

// Loading state interface
interface LazyComponentState {
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

// Error boundary for lazy components
class LazyComponentErrorBoundary extends React.Component<
  { 
    children: ReactNode; 
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    fallback?: ReactNode;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Lazy Loading] Component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load component. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Smart loading skeleton that adapts to content type
interface SmartSkeletonProps {
  type: 'form' | 'table' | 'card' | 'chart' | 'custom';
  height?: number;
  rows?: number;
  className?: string;
  animated?: boolean;
}

const SmartSkeleton: React.FC<SmartSkeletonProps> = ({
  type,
  height = 200,
  rows = 3,
  className = '',
  animated = true,
}) => {
  const skeletonClass = `${className} ${animated ? 'animate-pulse' : ''}`;

  switch (type) {
    case 'form':
      return (
        <div className={`space-y-4 p-4 ${skeletonClass}`}>
          <Skeleton className="h-8 w-3/4" />
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      );

    case 'table':
      return (
        <div className={`space-y-2 ${skeletonClass}`}>
          <div className="flex gap-4 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-t">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      );

    case 'card':
      return (
        <div className={`p-6 space-y-4 ${skeletonClass}`}>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      );

    case 'chart':
      return (
        <div className={`p-4 ${skeletonClass}`}>
          <Skeleton className="h-6 w-1/3 mb-4" />
          <div className="flex items-end justify-between h-32">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-8"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
        </div>
      );

    default:
      return <Skeleton className={`h-${height} w-full ${skeletonClass}`} />;
  }
};

// Progressive loading wrapper with intersection observer
interface ProgressiveLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  onVisible?: () => void;
  className?: string;
}

const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  onVisible,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [isVisible, threshold, rootMargin, onVisible]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
};

// Enhanced lazy component wrapper with retry logic
interface LazyComponentWrapperProps {
  loadComponent: () => Promise<{ default: ComponentType<any> }>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  retryable?: boolean;
  preload?: boolean;
  onLoadStart?: () => void;
  onLoadSuccess?: () => void;
  onLoadError?: (error: Error) => void;
  children?: (Component: ComponentType<any> | null, state: LazyComponentState) => ReactNode;
}

const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  loadComponent,
  fallback,
  errorFallback,
  retryable = true,
  preload = false,
  onLoadStart,
  onLoadSuccess,
  onLoadError,
  children,
}) => {
  const [state, setState] = useState<LazyComponentState>({
    isLoading: false,
    hasError: false,
    retryCount: 0,
  });
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const loadPromiseRef = useRef<Promise<any> | null>(null);

  const loadComponentWithRetry = async (attempt: number = 1): Promise<void> => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    setState(prev => ({ ...prev, isLoading: true, hasError: false }));
    onLoadStart?.();

    loadPromiseRef.current = loadComponent()
      .then(module => {
        setComponent(() => module.default);
        setState(prev => ({ ...prev, isLoading: false, hasError: false }));
        onLoadSuccess?.();
        return module;
      })
      .catch(async (error: Error) => {
        console.error(`[Lazy Loading] Failed to load component (attempt ${attempt}):`, error);
        
        if (attempt < LAZY_LOADING_CONFIG.RETRY.MAX_ATTEMPTS && retryable) {
          const delay = LAZY_LOADING_CONFIG.RETRY.DELAY_MS * 
            Math.pow(LAZY_LOADING_CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          loadPromiseRef.current = null;
          return loadComponentWithRetry(attempt + 1);
        } else {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            hasError: true, 
            error,
            retryCount: attempt 
          }));
          onLoadError?.(error);
          throw error;
        }
      });

    return loadPromiseRef.current;
  };

  const handleRetry = () => {
    loadPromiseRef.current = null;
    setState(prev => ({ ...prev, retryCount: 0 }));
    loadComponentWithRetry();
  };

  // Preload component on idle
  useEffect(() => {
    if (preload && LAZY_LOADING_CONFIG.PRELOAD.ENABLED) {
      const timer = setTimeout(() => {
        if (!Component && !state.isLoading && !state.hasError) {
          loadComponentWithRetry();
        }
      }, LAZY_LOADING_CONFIG.PRELOAD.IDLE_TIMEOUT);

      return () => clearTimeout(timer);
    }
  }, [preload, Component, state.isLoading, state.hasError]);

  // Custom render function
  if (children) {
    return <>{children(Component, state)}</>;
  }

  // Error state
  if (state.hasError && !state.isLoading) {
    return (
      errorFallback || (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load component after {state.retryCount} attempts.</span>
            {retryable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="ml-2"
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )
    );
  }

  // Loading state
  if (state.isLoading || !Component) {
    return fallback || <SmartSkeleton type="form" rows={5} />;
  }

  // Render loaded component
  return <Component />;
};

// Factory function for creating lazy-loaded components
export function createLazyComponent<T = {}>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  options?: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
    retryable?: boolean;
    preload?: boolean;
    progressive?: boolean;
    skeletonType?: SmartSkeletonProps['type'];
  }
) {
  const {
    fallback,
    errorFallback,
    retryable = true,
    preload = false,
    progressive = false,
    skeletonType = 'form',
  } = options || {};

  const LazyComponent = lazy(importFunction);

  return React.forwardRef<any, T>((props, ref) => {
    const content = (
      <LazyComponentErrorBoundary fallback={errorFallback}>
        <Suspense 
          fallback={fallback || <SmartSkeleton type={skeletonType} rows={5} />}
        >
          <LazyComponent {...props} ref={ref} />
        </Suspense>
      </LazyComponentErrorBoundary>
    );

    if (progressive) {
      return (
        <ProgressiveLoader
          fallback={fallback || <SmartSkeleton type={skeletonType} rows={5} />}
        >
          {content}
        </ProgressiveLoader>
      );
    }

    return content;
  });
}

// Lazy-loaded form components
export const LazyInitiativeForm = createLazyComponent(
  () => import('@/components/forms/InitiativeForm'),
  {
    skeletonType: 'form',
    retryable: true,
    preload: true,
  }
);

export const LazySubtaskManager = createLazyComponent(
  () => import('@/components/forms/SubtaskManager'),
  {
    skeletonType: 'form',
    retryable: true,
    preload: false,
  }
);

export const LazyExcelImportWizard = createLazyComponent(
  () => import('@/components/excel-import/ExcelImportWizard'),
  {
    skeletonType: 'form',
    retryable: true,
    preload: false,
    progressive: true,
  }
);

// Lazy-loaded dashboard components
export const LazyKPIDashboard = createLazyComponent(
  () => import('@/components/dashboard/EnhancedKPIDashboard'),
  {
    skeletonType: 'card',
    retryable: true,
    preload: true,
  }
);

export const LazyAreaPerformanceChart = createLazyComponent(
  () => import('@/components/dashboard/AreaPerformanceChart'),
  {
    skeletonType: 'chart',
    retryable: true,
    preload: false,
    progressive: true,
  }
);

export const LazyInitiativeTable = createLazyComponent(
  () => import('@/components/initiatives/InitiativeTable'),
  {
    skeletonType: 'table',
    retryable: true,
    preload: false,
    progressive: true,
  }
);

// Performance monitoring for lazy loading
export class LazyLoadingMonitor {
  private static loadTimes = new Map<string, number>();
  private static loadErrors = new Map<string, number>();

  static recordLoadStart(componentName: string): void {
    this.loadTimes.set(componentName, Date.now());
  }

  static recordLoadSuccess(componentName: string): void {
    const startTime = this.loadTimes.get(componentName);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`[Lazy Loading] ${componentName} loaded in ${duration}ms`);
      
      if (duration > 3000) {
        console.warn(`[Lazy Loading] Slow component load: ${componentName} took ${duration}ms`);
      }
    }
  }

  static recordLoadError(componentName: string, error: Error): void {
    const errorCount = this.loadErrors.get(componentName) || 0;
    this.loadErrors.set(componentName, errorCount + 1);
    
    console.error(`[Lazy Loading] ${componentName} failed to load:`, error);
  }

  static getPerformanceReport(): {
    componentName: string;
    loadTime?: number;
    errorCount: number;
  }[] {
    const report: any[] = [];
    
    // Combine load times and error counts
    const allComponents = new Set([
      ...this.loadTimes.keys(),
      ...this.loadErrors.keys(),
    ]);

    allComponents.forEach(componentName => {
      const startTime = this.loadTimes.get(componentName);
      const loadTime = startTime ? Date.now() - startTime : undefined;
      const errorCount = this.loadErrors.get(componentName) || 0;

      report.push({
        componentName,
        loadTime,
        errorCount,
      });
    });

    return report;
  }

  static clearMetrics(): void {
    this.loadTimes.clear();
    this.loadErrors.clear();
  }
}

// Export utilities
export {
  SmartSkeleton,
  ProgressiveLoader,
  LazyComponentWrapper,
  LazyComponentErrorBoundary,
  LAZY_LOADING_CONFIG,
  type LazyComponentState,
  type SmartSkeletonProps,
  type ProgressiveLoaderProps,
};