"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { componentPreloader } from '@/components/manager/LazyComponents';

interface LoadingPriority {
  component: string;
  priority: number;
  estimatedLoadTime: number;
  userInteractionScore: number;
}

interface UserBehaviorPattern {
  mostVisitedRoutes: string[];
  averageSessionDuration: number;
  commonComponentSequence: string[];
  deviceCapabilities: {
    connectionSpeed: 'slow' | 'fast' | 'unknown';
    memoryLevel: 'low' | 'high' | 'unknown';
    deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  };
}

/**
 * Hook for intelligent component loading based on user behavior and device capabilities
 * 
 * Features:
 * - Analyzes user interaction patterns
 * - Adapts loading strategy based on device capabilities
 * - Predicts which components user will likely need
 * - Implements progressive enhancement
 * - Monitors performance impact
 */
export function useIntelligentLoading() {
  const router = useRouter();
  const pathname = usePathname();
  const [isEnabled, setIsEnabled] = useState(true);
  const [loadingStrategy, setLoadingStrategy] = useState<'aggressive' | 'conservative' | 'adaptive'>('adaptive');
  
  // User behavior tracking
  const [userBehavior, setUserBehavior] = useState<UserBehaviorPattern>({
    mostVisitedRoutes: [],
    averageSessionDuration: 0,
    commonComponentSequence: [],
    deviceCapabilities: {
      connectionSpeed: 'unknown',
      memoryLevel: 'unknown',
      deviceType: 'unknown'
    }
  });

  const sessionStartTime = useRef<number>(Date.now());
  const componentInteractions = useRef<Record<string, number>>({});
  const routeVisits = useRef<Record<string, number>>({});

  /**
   * Detect device capabilities
   */
  const detectDeviceCapabilities = useCallback(() => {
    const capabilities = { ...userBehavior.deviceCapabilities };

    // Detect connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        if (connection.effectiveType === '4g' || connection.downlink > 10) {
          capabilities.connectionSpeed = 'fast';
        } else if (connection.effectiveType === '3g' || connection.downlink > 1) {
          capabilities.connectionSpeed = 'fast';
        } else {
          capabilities.connectionSpeed = 'slow';
        }
      }
    }

    // Detect device type
    const userAgent = navigator.userAgent;
    if (/Mobi|Android/i.test(userAgent)) {
      capabilities.deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
      capabilities.deviceType = 'tablet';
    } else {
      capabilities.deviceType = 'desktop';
    }

    // Estimate memory level
    if ('deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory;
      capabilities.memoryLevel = memory >= 4 ? 'high' : 'low';
    } else if ('hardwareConcurrency' in navigator) {
      // Fallback to CPU cores as memory indicator
      capabilities.memoryLevel = navigator.hardwareConcurrency >= 4 ? 'high' : 'low';
    }

    setUserBehavior(prev => ({
      ...prev,
      deviceCapabilities: capabilities
    }));

    return capabilities;
  }, [userBehavior.deviceCapabilities]);

  /**
   * Calculate loading priorities based on user behavior
   */
  const calculateLoadingPriorities = useCallback(() => {
    const priorities: LoadingPriority[] = [];

    // Common dashboard components with base priorities
    const baseComponents = [
      { component: 'AreaSummaryCards', basePriority: 100, estimatedLoadTime: 200 },
      { component: 'InitiativesList', basePriority: 90, estimatedLoadTime: 500 },
      { component: 'ManagerActivityFeed', basePriority: 70, estimatedLoadTime: 300 },
      { component: 'QuickActions', basePriority: 80, estimatedLoadTime: 150 },
      { component: 'AreaProgressVisualization', basePriority: 60, estimatedLoadTime: 400 },
      { component: 'FileManagementInterface', basePriority: 50, estimatedLoadTime: 600 }
    ];

    baseComponents.forEach(({ component, basePriority, estimatedLoadTime }) => {
      // Calculate user interaction score
      const interactionScore = componentInteractions.current[component] || 0;
      
      // Adjust priority based on route
      let routeBonus = 0;
      if (pathname.includes('initiatives') && component === 'InitiativesList') {
        routeBonus = 50;
      } else if (pathname.includes('files') && component === 'FileManagementInterface') {
        routeBonus = 50;
      } else if (pathname.includes('dashboard') && component === 'AreaSummaryCards') {
        routeBonus = 30;
      }

      // Device capability adjustments
      let devicePenalty = 0;
      if (userBehavior.deviceCapabilities.connectionSpeed === 'slow') {
        devicePenalty = 20;
      }
      if (userBehavior.deviceCapabilities.memoryLevel === 'low') {
        devicePenalty += 15;
      }
      if (userBehavior.deviceCapabilities.deviceType === 'mobile') {
        devicePenalty += 10;
      }

      const finalPriority = basePriority + routeBonus + (interactionScore * 5) - devicePenalty;

      priorities.push({
        component,
        priority: Math.max(0, finalPriority),
        estimatedLoadTime,
        userInteractionScore: interactionScore
      });
    });

    return priorities.sort((a, b) => b.priority - a.priority);
  }, [pathname, userBehavior.deviceCapabilities]);

  /**
   * Intelligent preloading based on priorities
   */
  const intelligentPreload = useCallback(async () => {
    if (!isEnabled) return;

    const priorities = calculateLoadingPriorities();
    const capabilities = userBehavior.deviceCapabilities;

    // Determine how many components to preload based on device capabilities
    let maxConcurrentLoads = 2;
    if (capabilities.connectionSpeed === 'fast' && capabilities.memoryLevel === 'high') {
      maxConcurrentLoads = 4;
    } else if (capabilities.connectionSpeed === 'slow' || capabilities.memoryLevel === 'low') {
      maxConcurrentLoads = 1;
    }

    // Load high priority components first
    const highPriorityComponents = priorities
      .filter(p => p.priority >= 80)
      .slice(0, maxConcurrentLoads);

    for (const { component } of highPriorityComponents) {
      try {
        await componentPreloader.preloadComponent(component);
      } catch (error) {
        console.warn(`Failed to preload high priority component ${component}:`, error);
      }
    }

    // Load medium priority components with delay
    if (capabilities.connectionSpeed !== 'slow') {
      setTimeout(() => {
        const mediumPriorityComponents = priorities
          .filter(p => p.priority >= 50 && p.priority < 80)
          .slice(0, 2);

        mediumPriorityComponents.forEach(({ component }) => {
          componentPreloader.preloadComponent(component).catch(error =>
            console.warn(`Failed to preload medium priority component ${component}:`, error)
          );
        });
      }, 1000);
    }
  }, [isEnabled, calculateLoadingPriorities, userBehavior.deviceCapabilities]);

  /**
   * Track component interactions
   */
  const trackComponentInteraction = useCallback((componentName: string) => {
    componentInteractions.current[componentName] = (componentInteractions.current[componentName] || 0) + 1;
  }, []);

  /**
   * Track route visits
   */
  const trackRouteVisit = useCallback((route: string) => {
    routeVisits.current[route] = (routeVisits.current[route] || 0) + 1;
  }, []);

  /**
   * Update loading strategy based on conditions
   */
  const updateLoadingStrategy = useCallback(() => {
    const capabilities = userBehavior.deviceCapabilities;
    
    if (capabilities.connectionSpeed === 'slow' || capabilities.memoryLevel === 'low') {
      setLoadingStrategy('conservative');
    } else if (capabilities.connectionSpeed === 'fast' && capabilities.memoryLevel === 'high') {
      setLoadingStrategy('aggressive');
    } else {
      setLoadingStrategy('adaptive');
    }
  }, [userBehavior.deviceCapabilities]);

  /**
   * Get recommended loading delay for a component
   */
  const getComponentLoadingDelay = useCallback((componentName: string, priority: 'high' | 'normal' | 'low') => {
    const baseDelays = {
      aggressive: { high: 0, normal: 100, low: 300 },
      adaptive: { high: 0, normal: 200, low: 500 },
      conservative: { high: 100, normal: 500, low: 1000 }
    };

    return baseDelays[loadingStrategy][priority];
  }, [loadingStrategy]);

  /**
   * Check if component should be lazy loaded
   */
  const shouldLazyLoad = useCallback((componentName: string) => {
    if (!isEnabled) return false;

    const priorities = calculateLoadingPriorities();
    const componentPriority = priorities.find(p => p.component === componentName);
    
    if (!componentPriority) return true;

    // Don't lazy load high priority components on fast devices
    if (componentPriority.priority >= 90 && userBehavior.deviceCapabilities.connectionSpeed === 'fast') {
      return false;
    }

    return true;
  }, [isEnabled, calculateLoadingPriorities, userBehavior.deviceCapabilities]);

  /**
   * Performance monitoring
   */
  const getPerformanceMetrics = useCallback(() => {
    const sessionDuration = Date.now() - sessionStartTime.current;
    const totalInteractions = Object.values(componentInteractions.current).reduce((sum, count) => sum + count, 0);

    return {
      sessionDuration,
      totalComponentInteractions: totalInteractions,
      mostInteractedComponents: Object.entries(componentInteractions.current)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      mostVisitedRoutes: Object.entries(routeVisits.current)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      loadingStrategy,
      deviceCapabilities: userBehavior.deviceCapabilities
    };
  }, [loadingStrategy, userBehavior.deviceCapabilities]);

  // Initialize on mount
  useEffect(() => {
    detectDeviceCapabilities();
  }, [detectDeviceCapabilities]);

  // Update strategy when capabilities change
  useEffect(() => {
    updateLoadingStrategy();
  }, [updateLoadingStrategy]);

  // Track route changes
  useEffect(() => {
    trackRouteVisit(pathname);
  }, [pathname, trackRouteVisit]);

  // Intelligent preloading on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      intelligentPreload();
    }, 500); // Small delay to avoid interfering with page load

    return () => clearTimeout(timer);
  }, [pathname, intelligentPreload]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      
      // Store user behavior patterns in localStorage for next session
      try {
        const behaviorData = {
          sessionDuration,
          componentInteractions: componentInteractions.current,
          routeVisits: routeVisits.current,
          deviceCapabilities: userBehavior.deviceCapabilities,
          timestamp: Date.now()
        };
        
        localStorage.setItem('mariana-user-behavior', JSON.stringify(behaviorData));
      } catch (error) {
        console.warn('Failed to store user behavior data:', error);
      }
    };
  }, [userBehavior.deviceCapabilities]);

  // Load stored behavior patterns on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem('mariana-user-behavior');
      if (storedData) {
        const data = JSON.parse(storedData);
        
        // Only use recent data (last 7 days)
        if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) {
          componentInteractions.current = data.componentInteractions || {};
          routeVisits.current = data.routeVisits || {};
          
          setUserBehavior(prev => ({
            ...prev,
            averageSessionDuration: data.sessionDuration || 0,
            deviceCapabilities: data.deviceCapabilities || prev.deviceCapabilities
          }));
        }
      }
    } catch (error) {
      console.warn('Failed to load stored user behavior data:', error);
    }
  }, []);

  return {
    // Configuration
    isEnabled,
    setIsEnabled,
    loadingStrategy,
    setLoadingStrategy,
    
    // Device info
    deviceCapabilities: userBehavior.deviceCapabilities,
    
    // Utilities
    trackComponentInteraction,
    shouldLazyLoad,
    getComponentLoadingDelay,
    intelligentPreload,
    
    // Analytics
    getPerformanceMetrics,
    
    // Component priorities
    getLoadingPriorities: calculateLoadingPriorities
  };
}

/**
 * Hook for component-specific loading optimization
 */
export function useComponentLoadingOptimization(componentName: string) {
  const {
    shouldLazyLoad,
    getComponentLoadingDelay,
    trackComponentInteraction,
    deviceCapabilities
  } = useIntelligentLoading();

  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!componentRef.current || !shouldLazyLoad(componentName)) {
      setIsLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          
          // Add loading delay based on device capabilities
          const delay = getComponentLoadingDelay(componentName, 'normal');
          setTimeout(() => {
            setIsLoaded(true);
            trackComponentInteraction(componentName);
          }, delay);
          
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: deviceCapabilities.connectionSpeed === 'fast' ? '200px' : '50px',
        threshold: 0.1
      }
    );

    observer.observe(componentRef.current);

    return () => {
      if (componentRef.current) {
        observer.unobserve(componentRef.current);
      }
    };
  }, [componentName, shouldLazyLoad, getComponentLoadingDelay, trackComponentInteraction, deviceCapabilities]);

  return {
    componentRef,
    isLoaded,
    isVisible,
    shouldLazyLoad: shouldLazyLoad(componentName)
  };
}