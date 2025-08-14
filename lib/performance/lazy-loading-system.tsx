/**
 * Comprehensive Lazy Loading System
 * Implements progressive loading, code splitting, and dynamic imports
 */

import React, { lazy, Suspense, ComponentType, LazyExoticComponent } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// LOADING FALLBACK COMPONENTS
// ============================================================================

export const LoadingFallbacks = {
  // Spinner fallback
  Spinner: () => (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  ),

  // Skeleton fallbacks for different component types
  Card: () => (
    <div className="space-y-4 p-6 border rounded-lg">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-32 w-full" />
    </div>
  ),

  Table: () => (
    <div className="space-y-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
    </div>
  ),

  Chart: () => (
    <div className="h-64 p-4 border rounded-lg">
      <Skeleton className="h-full w-full" />
    </div>
  ),

  Form: () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  ),

  Dashboard: () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingFallbacks.Card key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LoadingFallbacks.Chart />
        <LoadingFallbacks.Table />
      </div>
    </div>
  ),

  // Minimal fallback for quick loading
  Minimal: () => (
    <div className="animate-pulse">
      <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
      <div className="h-2 bg-muted rounded w-1/2"></div>
    </div>
  )
};

// ============================================================================
// LAZY COMPONENT FACTORY
// ============================================================================

interface LazyComponentOptions {
  fallback?: ComponentType;
  errorFallback?: ComponentType<{ error?: Error; retry?: () => void }>;
  loadingDelay?: number;
  chunkName?: string;
  preload?: boolean;
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const {
    fallback = LoadingFallbacks.Spinner,
    errorFallback,
    loadingDelay = 200,
    chunkName,
    preload = false
  } = options;

  // Create lazy component with chunk naming
  const LazyComponent = lazy(() => {
    const importPromise = importFn();
    
    // Add webpack chunk name if provided
    if (chunkName && process.env.NODE_ENV === 'production') {
      importPromise.catch(console.error);
    }
    
    return importPromise;
  });

  // Preload if requested
  if (preload && typeof window !== 'undefined') {
    // Preload after initial render
    setTimeout(() => importFn().catch(console.error), 100);
  }

  // Return wrapped component
  return LazyComponent;
}

// ============================================================================
// PROGRESSIVE LOADING WRAPPER
// ============================================================================

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  delay?: number;
  timeout?: number;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  fallback = <LoadingFallbacks.Spinner />,
  errorFallback,
  delay = 200,
  timeout = 10000,
  onLoadStart,
  onLoadComplete,
  onLoadError
}) => {
  const [showFallback, setShowFallback] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    onLoadStart?.();

    // Show fallback after delay
    const delayTimeout = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    // Timeout handling
    timeoutRef.current = setTimeout(() => {
      const error = new Error('Component loading timeout');
      setHasError(true);
      onLoadError?.(error);
    }, timeout);

    return () => {
      clearTimeout(delayTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, timeout, onLoadStart, onLoadError]);

  const handleLoadComplete = React.useCallback(() => {
    setShowFallback(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onLoadComplete?.();
  }, [onLoadComplete]);

  if (hasError) {
    return errorFallback || <div>Failed to load component</div>;
  }

  return (
    <ErrorBoundary 
      fallback={errorFallback}
      onError={onLoadError}
    >
      <Suspense fallback={showFallback ? fallback : null}>
        <LoadingCompleteDetector onComplete={handleLoadComplete}>
          {children}
        </LoadingCompleteDetector>
      </Suspense>
    </ErrorBoundary>
  );
};

// Helper component to detect when loading is complete
const LoadingCompleteDetector: React.FC<{
  children: React.ReactNode;
  onComplete: () => void;
}> = ({ children, onComplete }) => {
  React.useEffect(() => {
    onComplete();
  }, [onComplete]);

  return <>{children}</>;
};

// ============================================================================
// LAZY LOADED COMPONENT DEFINITIONS
// ============================================================================

// Dashboard Components
export const LazyDashboardComponents = {
  CEODashboard: createLazyComponent(
    () => import('@/app/ceo/page'),
    { 
      fallback: LoadingFallbacks.Dashboard,
      chunkName: 'ceo-dashboard',
      preload: false
    }
  ),

  ManagerDashboard: createLazyComponent(
    () => import('@/app/manager/page'),
    { 
      fallback: LoadingFallbacks.Dashboard,
      chunkName: 'manager-dashboard'
    }
  ),

  AdminDashboard: createLazyComponent(
    () => import('@/app/admin/page'),
    { 
      fallback: LoadingFallbacks.Dashboard,
      chunkName: 'admin-dashboard'
    }
  ),
};

// Analytics Components
export const LazyAnalyticsComponents = {
  AreaComparison: createLazyComponent(
    () => import('@/app/dashboard/analytics/area-comparison/page'),
    { 
      fallback: LoadingFallbacks.Chart,
      chunkName: 'area-comparison'
    }
  ),

  ProgressDistribution: createLazyComponent(
    () => import('@/app/dashboard/analytics/progress-distribution/page'),
    { 
      fallback: LoadingFallbacks.Chart,
      chunkName: 'progress-distribution'
    }
  ),

  StatusDistribution: createLazyComponent(
    () => import('@/app/dashboard/analytics/status-distribution/page'),
    { 
      fallback: LoadingFallbacks.Chart,
      chunkName: 'status-distribution'
    }
  ),

  TrendAnalytics: createLazyComponent(
    () => import('@/app/dashboard/analytics/trend-analytics/page'),
    { 
      fallback: LoadingFallbacks.Chart,
      chunkName: 'trend-analytics'
    }
  ),
};

// Form Components
export const LazyFormComponents = {
  InvitationForm: createLazyComponent(
    () => import('@/components/forms/UserInviteForm'),
    { 
      fallback: LoadingFallbacks.Form,
      chunkName: 'invitation-form'
    }
  ),

  InitiativeForm: createLazyComponent(
    () => import('@/components/forms/InitiativeForm'),
    { 
      fallback: LoadingFallbacks.Form,
      chunkName: 'initiative-form'
    }
  ),

  ObjectiveForm: createLazyComponent(
    () => import('@/components/forms/ObjectiveForm'),
    { 
      fallback: LoadingFallbacks.Form,
      chunkName: 'objective-form'
    }
  ),
};

// Dialog Components
export const LazyDialogComponents = {
  InitiativeFormModal: createLazyComponent(
    () => import('@/components/modals/InitiativeFormModal'),
    { 
      fallback: LoadingFallbacks.Minimal,
      chunkName: 'initiative-modal'
    }
  ),

  ObjectiveFormModal: createLazyComponent(
    () => import('@/components/modals/ObjectiveFormModal'),
    { 
      fallback: LoadingFallbacks.Minimal,
      chunkName: 'objective-modal'
    }
  ),

  AreaFormModal: createLazyComponent(
    () => import('@/components/modals/AreaFormModal'),
    { 
      fallback: LoadingFallbacks.Minimal,
      chunkName: 'area-modal'
    }
  ),
};

// Heavy Feature Components
export const LazyFeatureComponents = {
  StratixAssistant: createLazyComponent(
    () => import('@/app/stratix-assistant/page'),
    { 
      fallback: LoadingFallbacks.Card,
      chunkName: 'stratix-assistant'
    }
  ),

  InvitationDashboard: createLazyComponent(
    () => import('@/components/invitations/InvitationDashboard'),
    { 
      fallback: LoadingFallbacks.Dashboard,
      chunkName: 'invitation-dashboard'
    }
  ),

  FileUploadManager: createLazyComponent(
    () => import('@/components/okr-upload/OKRFileUpload'),
    { 
      fallback: LoadingFallbacks.Card,
      chunkName: 'file-upload'
    }
  ),
};

// ============================================================================
// INTERSECTION OBSERVER LAZY LOADING
// ============================================================================

interface IntersectionLazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  onVisible?: () => void;
}

export const IntersectionLazyLoad: React.FC<IntersectionLazyLoadProps> = ({
  children,
  fallback = <LoadingFallbacks.Minimal />,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  onVisible
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasTriggered, setHasTriggered] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          setIsVisible(true);
          setHasTriggered(true);
          onVisible?.();
          
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasTriggered, onVisible]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};

// ============================================================================
// ROUTE-BASED CODE SPLITTING
// ============================================================================

export const LazyRouteComponents = {
  // Public routes
  Login: createLazyComponent(() => import('@/app/auth/login/page'), {
    fallback: LoadingFallbacks.Form,
    chunkName: 'auth-login',
    preload: true // Preload login for faster auth
  }),

  Register: createLazyComponent(() => import('@/app/auth/register/page'), {
    fallback: LoadingFallbacks.Form,
    chunkName: 'auth-register'
  }),

  // Dashboard routes
  Dashboard: createLazyComponent(() => import('@/app/dashboard/page'), {
    fallback: LoadingFallbacks.Dashboard,
    chunkName: 'main-dashboard'
  }),

  Activities: createLazyComponent(() => import('@/app/dashboard/activities/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'activities-page'
  }),

  Initiatives: createLazyComponent(() => import('@/app/dashboard/initiatives/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'initiatives-page'
  }),

  Objectives: createLazyComponent(() => import('@/app/dashboard/objectives/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'objectives-page'
  }),

  Areas: createLazyComponent(() => import('@/app/dashboard/areas/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'areas-page'
  }),

  // Admin routes
  OrgAdmin: createLazyComponent(() => import('@/app/org-admin/page'), {
    fallback: LoadingFallbacks.Dashboard,
    chunkName: 'org-admin'
  }),

  OrgAdminUsers: createLazyComponent(() => import('@/app/org-admin/users/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'org-admin-users'
  }),

  OrgAdminAreas: createLazyComponent(() => import('@/app/org-admin/areas/page'), {
    fallback: LoadingFallbacks.Table,
    chunkName: 'org-admin-areas'
  }),

  // Profile routes
  Profile: createLazyComponent(() => import('@/app/profile/page'), {
    fallback: LoadingFallbacks.Form,
    chunkName: 'profile'
  }),

  CompanyProfile: createLazyComponent(() => import('@/app/profile/company/page'), {
    fallback: LoadingFallbacks.Form,
    chunkName: 'company-profile'
  }),
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export const LazyLoadingMonitor = {
  trackLoadTime: (componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} lazy loaded in ${loadTime.toFixed(2)}ms`);
      }
      
      // Track in analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'timing_complete', {
          name: 'lazy_load',
          value: Math.round(loadTime),
          custom_parameter: componentName
        });
      }
    };
  },

  trackChunkSize: (chunkName: string) => {
    if (process.env.NODE_ENV === 'development') {
      // This would be implemented with webpack bundle analyzer data
      console.log(`Chunk ${chunkName} loaded`);
    }
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
  LoadingFallbacks,
  ProgressiveLoader,
  IntersectionLazyLoad,
  LazyDashboardComponents,
  LazyAnalyticsComponents,
  LazyFormComponents,
  LazyDialogComponents,
  LazyFeatureComponents,
  LazyRouteComponents,
  LazyLoadingMonitor,
  createLazyComponent
};