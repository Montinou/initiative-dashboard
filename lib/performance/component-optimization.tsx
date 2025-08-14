/**
 * Component Performance Optimization
 * Implements memoization, optimized re-renders, and performance patterns
 */

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  forwardRef, 
  lazy, 
  Suspense, 
  ComponentType,
  PropsWithChildren
} from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// ============================================================================
// MEMOIZATION UTILITIES
// ============================================================================

/**
 * Smart memo wrapper that provides better debugging and control
 */
export function smartMemo<T extends ComponentType<any>>(
  Component: T,
  propsAreEqual?: (prevProps: any, nextProps: any) => boolean,
  displayName?: string
): T {
  const MemoizedComponent = memo(Component, propsAreEqual) as T;
  
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  } else {
    MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name || 'Component'})`;
  }
  
  // Add performance debugging in development
  if (process.env.NODE_ENV === 'development') {
    return forwardRef<any, any>((props, ref) => {
      const renderCount = React.useRef(0);
      renderCount.current += 1;
      
      React.useEffect(() => {
        console.log(`${MemoizedComponent.displayName} rendered ${renderCount.current} times`);
      });
      
      return <MemoizedComponent {...props} ref={ref} />;
    }) as T;
  }
  
  return MemoizedComponent;
}

/**
 * Optimized props comparison for common patterns
 */
export const shallowPropsAreEqual = (prevProps: any, nextProps: any): boolean => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }
  
  return true;
};

export const deepPropsAreEqual = (prevProps: any, nextProps: any): boolean => {
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
};

// ============================================================================
// OPTIMIZED HOOK PATTERNS
// ============================================================================

/**
 * Stable callback hook with dependency optimization
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const ref = React.useRef<T>();
  
  // Update ref when dependencies change
  React.useEffect(() => {
    ref.current = callback;
  }, deps);
  
  // Return stable callback
  return useCallback((...args: any[]) => {
    return ref.current?.(...args);
  }, []) as T;
}

/**
 * Optimized useMemo with performance tracking
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const startTime = React.useRef<number>();
  
  return useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      startTime.current = performance.now();
    }
    
    const result = factory();
    
    if (process.env.NODE_ENV === 'development' && startTime.current) {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      
      if (duration > 1) { // Log only significant computations
        console.log(
          `${debugName || 'useMemo'} computation took ${duration.toFixed(2)}ms`
        );
      }
    }
    
    return result;
  }, deps);
}

/**
 * Debounced state hook for performance
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState<T>(initialValue);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return [value, debouncedValue, setValue];
}

// ============================================================================
// OPTIMIZED COMPONENT PATTERNS
// ============================================================================

/**
 * Virtual list component for large datasets
 */
interface VirtualListProps {
  items: any[];
  itemHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  containerHeight: number;
  overscan?: number;
}

export const VirtualList = smartMemo<React.FC<VirtualListProps>>(
  ({ items, itemHeight, renderItem, containerHeight, overscan = 5 }) => {
    const [scrollTop, setScrollTop] = React.useState(0);
    
    const visibleRange = useOptimizedMemo(() => {
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
      
      return { startIndex, endIndex };
    }, [scrollTop, itemHeight, containerHeight, items.length, overscan], 'VirtualList.visibleRange');
    
    const visibleItems = useOptimizedMemo(() => {
      return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
    }, [items, visibleRange.startIndex, visibleRange.endIndex], 'VirtualList.visibleItems');
    
    const handleScroll = useStableCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, []);
    
    return (
      <div
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
      >
        <div style={{ height: items.length * itemHeight, position: 'relative' }}>
          {visibleItems.map((item, index) => (
            <div
              key={visibleRange.startIndex + index}
              style={{
                position: 'absolute',
                top: (visibleRange.startIndex + index) * itemHeight,
                height: itemHeight,
                width: '100%'
              }}
            >
              {renderItem(item, visibleRange.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    );
  },
  shallowPropsAreEqual,
  'VirtualList'
);

/**
 * Optimized form field wrapper
 */
interface OptimizedFormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  description?: string;
}

export const OptimizedFormField = smartMemo<React.FC<OptimizedFormFieldProps>>(
  ({ label, error, children, required, description }) => {
    const id = React.useId();
    
    const fieldClasses = useOptimizedMemo(() => {
      return `space-y-2 ${error ? 'error' : ''}`;
    }, [error], 'OptimizedFormField.classes');
    
    return (
      <div className={fieldClasses}>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        
        <div className="relative">
          {React.cloneElement(children as React.ReactElement, { id })}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
  shallowPropsAreEqual,
  'OptimizedFormField'
);

/**
 * Optimized data table row
 */
interface OptimizedTableRowProps {
  data: Record<string, any>;
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: Record<string, any>) => React.ReactNode;
  }>;
  onRowClick?: (data: Record<string, any>) => void;
  selected?: boolean;
}

export const OptimizedTableRow = smartMemo<React.FC<OptimizedTableRowProps>>(
  ({ data, columns, onRowClick, selected }) => {
    const handleClick = useStableCallback(() => {
      onRowClick?.(data);
    }, [data, onRowClick]);
    
    const rowClasses = useOptimizedMemo(() => {
      return `table-row ${selected ? 'bg-muted' : ''} ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`;
    }, [selected, onRowClick], 'OptimizedTableRow.classes');
    
    return (
      <tr className={rowClasses} onClick={handleClick}>
        {columns.map((column) => (
          <td key={column.key} className="px-4 py-2">
            {column.render ? column.render(data[column.key], data) : data[column.key]}
          </td>
        ))}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.selected === nextProps.selected &&
      prevProps.data === nextProps.data &&
      prevProps.columns === nextProps.columns &&
      prevProps.onRowClick === nextProps.onRowClick
    );
  },
  'OptimizedTableRow'
);

/**
 * Optimized chart wrapper with lazy loading
 */
interface OptimizedChartProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  config?: any;
  loading?: boolean;
  error?: string;
}

export const OptimizedChart = smartMemo<React.FC<OptimizedChartProps>>(
  ({ type, data, config, loading, error }) => {
    const ChartComponent = useOptimizedMemo(() => {
      switch (type) {
        case 'line':
          return lazy(() => import('@/components/blocks/charts').then(m => ({ default: m.LineChartBlock })));
        case 'bar':
          return lazy(() => import('@/components/blocks/charts').then(m => ({ default: m.BarChartBlock })));
        case 'pie':
          return lazy(() => import('@/components/blocks/charts').then(m => ({ default: m.PieChartBlock })));
        case 'area':
          return lazy(() => import('@/components/blocks/charts').then(m => ({ default: m.AreaChartBlock })));
        default:
          return lazy(() => import('@/components/blocks/charts').then(m => ({ default: m.LineChartBlock })));
      }
    }, [type], 'OptimizedChart.component');
    
    if (loading) {
      return (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="h-64 flex items-center justify-center text-destructive">
          Error loading chart: {error}
        </div>
      );
    }
    
    return (
      <ErrorBoundary fallback={<div>Chart failed to load</div>}>
        <Suspense fallback={
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse bg-muted rounded h-full w-full"></div>
          </div>
        }>
          <ChartComponent data={data} config={config} />
        </Suspense>
      </ErrorBoundary>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.type === nextProps.type &&
      prevProps.data === nextProps.data &&
      prevProps.config === nextProps.config &&
      prevProps.loading === nextProps.loading &&
      prevProps.error === nextProps.error
    );
  },
  'OptimizedChart'
);

// ============================================================================
// PERFORMANCE MONITORING COMPONENT
// ============================================================================

interface PerformanceMonitorProps extends PropsWithChildren {
  name: string;
  threshold?: number; // Log if render takes longer than this (ms)
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  children, 
  name, 
  threshold = 16 // One frame at 60fps
}) => {
  const renderStart = React.useRef<number>();
  
  React.useLayoutEffect(() => {
    renderStart.current = performance.now();
  });
  
  React.useLayoutEffect(() => {
    if (renderStart.current) {
      const renderTime = performance.now() - renderStart.current;
      
      if (renderTime > threshold) {
        console.warn(
          `${name} render took ${renderTime.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    }
  });
  
  return <>{children}</>;
};

// ============================================================================
// LAZY LOADING UTILITIES
// ============================================================================

/**
 * Enhanced lazy loading with error boundaries and fallbacks
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <ErrorBoundary fallback={errorFallback || <div>Component failed to load</div>}>
      <Suspense fallback={fallback || <div>Loading...</div>}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </ErrorBoundary>
  ));
}

/**
 * Intersection observer based lazy loading
 */
export function useIntersectionLazyLoad(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return [ref, isVisible] as const;
}

// ============================================================================
// EXPORT OPTIMIZED COMPONENTS
// ============================================================================

export {
  VirtualList as OptimizedVirtualList,
  OptimizedFormField,
  OptimizedTableRow,
  OptimizedChart,
  PerformanceMonitor,
  smartMemo,
  useStableCallback,
  useOptimizedMemo,
  useDebouncedState,
  createLazyComponent,
  useIntersectionLazyLoad
};