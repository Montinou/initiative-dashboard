"use client";

import dynamic from 'next/dynamic';
import { ComponentType, Suspense } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Loading fallback components for different dashboard sections
 */

// Generic skeleton for cards
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <Skeleton className="h-6 w-48 bg-white/10" />
        <Skeleton className="h-4 w-32 bg-white/10" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full bg-white/10" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 bg-white/10" />
            <Skeleton className="h-16 bg-white/10" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Table skeleton for lists
export function TableSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 bg-white/10" />
          <Skeleton className="h-8 w-24 bg-white/10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32 bg-white/10" />
          <Skeleton className="h-8 w-32 bg-white/10" />
          <Skeleton className="h-8 w-32 bg-white/10" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-12 bg-white/10" />
              <Skeleton className="h-4 flex-1 bg-white/10" />
              <Skeleton className="h-4 w-20 bg-white/10" />
              <Skeleton className="h-4 w-16 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Chart skeleton
export function ChartSkeleton({ className = "" }: { className?: string }) {
  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <Skeleton className="h-6 w-48 bg-white/10" />
        <Skeleton className="h-4 w-32 bg-white/10" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-end space-x-2 h-32">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="bg-white/10 flex-1" 
                style={{ height: `${Math.random() * 100 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8 bg-white/10" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Summary cards skeleton
export function SummaryCardsSkeleton({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-8 w-16 bg-white/10" />
              </div>
              <Skeleton className="h-12 w-12 rounded bg-white/10" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading spinner with message
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Error fallback component
export function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) {
  return (
    <Card className="glass-card border-red-500/20">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              Something went wrong
            </h3>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={resetErrorBoundary}
              className="mt-3 px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Higher-order component for lazy loading with custom fallback
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback: ComponentType = LoadingSpinner,
  errorFallback: ComponentType<{ error: Error; resetErrorBoundary: () => void }> = ErrorFallback
) {
  return function LazyComponent(props: P) {
    return (
      <Suspense fallback={<fallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy-loaded manager dashboard components
 */

// Area summary cards with skeleton
export const LazyAreaSummaryCards = dynamic(
  () => import('./AreaSummaryCards').then(mod => ({ default: mod.AreaSummaryCards })),
  {
    loading: () => <SummaryCardsSkeleton count={4} />,
    ssr: false
  }
);

// Initiatives list with table skeleton
export const LazyInitiativesList = dynamic(
  () => import('./InitiativesList').then(mod => ({ default: mod.InitiativesList })),
  {
    loading: () => <TableSkeleton rows={8} />,
    ssr: false
  }
);

// Activity feed with card skeleton
export const LazyManagerActivityFeed = dynamic(
  () => import('./ManagerActivityFeed').then(mod => ({ default: mod.ManagerActivityFeed })),
  {
    loading: () => <CardSkeleton />,
    ssr: false
  }
);

// Progress visualization with chart skeleton
export const LazyAreaProgressVisualization = dynamic(
  () => import('./AreaProgressVisualization').then(mod => ({ default: mod.AreaProgressVisualization })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

// Quick actions with card skeleton
export const LazyQuickActions = dynamic(
  () => import('./QuickActions').then(mod => ({ default: mod.QuickActions })),
  {
    loading: () => <CardSkeleton />,
    ssr: false
  }
);

// File management interface with table skeleton
export const LazyFileManagementInterface = dynamic(
  () => import('./FileManagementInterface').then(mod => ({ default: mod.FileManagementInterface })),
  {
    loading: () => <TableSkeleton rows={6} />,
    ssr: false
  }
);

// Initiative creation form
export const LazyInitiativeCreationForm = dynamic(
  () => import('./InitiativeCreationForm').then(mod => ({ default: mod.InitiativeCreationForm })),
  {
    loading: () => <CardSkeleton />,
    ssr: false
  }
);

// Subtask management
export const LazySubtaskManagement = dynamic(
  () => import('./SubtaskManagement').then(mod => ({ default: mod.SubtaskManagement })),
  {
    loading: () => <CardSkeleton />,
    ssr: false
  }
);

// Initiative progress tracking
export const LazyInitiativeProgressTracking = dynamic(
  () => import('./InitiativeProgressTracking').then(mod => ({ default: mod.InitiativeProgressTracking })),
  {
    loading: () => <CardSkeleton />,
    ssr: false
  }
);

/**
 * Smart lazy loading based on viewport intersection
 */
export function LazyLoadOnScroll({ 
  children, 
  fallback = <LoadingSpinner />,
  rootMargin = "100px",
  threshold = 0.1 
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [ref, setRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(ref);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [ref, rootMargin, threshold]);

  return (
    <div ref={setRef}>
      {isVisible ? children : fallback}
    </div>
  );
}

/**
 * Progressive lazy loading for dashboard sections
 */
export function ProgressiveDashboardLoader({ 
  children, 
  priority = 'normal',
  delay = 0 
}: {
  children: React.ReactNode;
  priority?: 'high' | 'normal' | 'low';
  delay?: number;
}) {
  const [shouldLoad, setShouldLoad] = useState(priority === 'high');

  useEffect(() => {
    if (priority === 'high') return;

    const loadDelay = priority === 'normal' ? delay : delay + 1000;
    
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, loadDelay);

    return () => clearTimeout(timer);
  }, [priority, delay]);

  if (!shouldLoad) {
    return <LoadingSpinner message="Loading component..." />;
  }

  return <>{children}</>;
}

/**
 * Preload components based on user interaction patterns
 */
export class ComponentPreloader {
  private static instance: ComponentPreloader;
  private preloadedComponents = new Set<string>();

  static getInstance(): ComponentPreloader {
    if (!ComponentPreloader.instance) {
      ComponentPreloader.instance = new ComponentPreloader();
    }
    return ComponentPreloader.instance;
  }

  async preloadComponent(componentName: string): Promise<void> {
    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    try {
      switch (componentName) {
        case 'InitiativesList':
          await import('./InitiativesList');
          break;
        case 'FileManagementInterface':
          await import('./FileManagementInterface');
          break;
        case 'AreaProgressVisualization':
          await import('./AreaProgressVisualization');
          break;
        // Add more components as needed
      }
      
      this.preloadedComponents.add(componentName);
      console.log(`Preloaded component: ${componentName}`);
    } catch (error) {
      console.warn(`Failed to preload component ${componentName}:`, error);
    }
  }

  preloadDashboardComponents(): void {
    // Preload commonly used components
    const commonComponents = [
      'InitiativesList',
      'AreaProgressVisualization',
      'ManagerActivityFeed'
    ];

    commonComponents.forEach(component => {
      this.preloadComponent(component);
    });
  }

  getPreloadedComponents(): string[] {
    return Array.from(this.preloadedComponents);
  }
}

// Singleton instance
export const componentPreloader = ComponentPreloader.getInstance();

/**
 * Hook for managing lazy loading state
 */
export function useLazyLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = (componentId: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [componentId]: loading }));
  };

  const isLoading = (componentId: string) => loadingStates[componentId] || false;

  const preloadComponents = () => {
    componentPreloader.preloadDashboardComponents();
  };

  return {
    setLoading,
    isLoading,
    preloadComponents,
    loadingStates
  };
}