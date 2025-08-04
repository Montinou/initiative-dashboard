/**
 * Cache Invalidation Middleware for PERF-002 Caching Strategy
 * 
 * Automatic cache invalidation on data mutations with:
 * - Database trigger-like invalidation
 * - Smart pattern matching for related data
 * - Performance monitoring and logging
 * - Graceful error handling
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-002 Caching Strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { CacheInvalidationManager } from './kpi-cache';

// Middleware configuration
interface CacheMiddlewareConfig {
  enableLogging: boolean;
  enableMetrics: boolean;
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: CacheMiddlewareConfig = {
  enableLogging: process.env.NODE_ENV !== 'production',
  enableMetrics: true,
  maxRetries: 2,
  timeoutMs: 5000,
};

// API route patterns that trigger cache invalidation
const INVALIDATION_PATTERNS = {
  // Initiative-related routes
  initiatives: {
    pattern: /^\/api\/(initiatives|dashboard\/objectives)/,
    handler: 'onInitiativeChange',
    extractors: {
      tenantId: (req: NextRequest) => req.headers.get('x-tenant-id') || extractFromUrl(req.url, 'tenantId'),
      areaId: (req: NextRequest) => extractFromUrl(req.url, 'areaId') || extractFromBody(req, 'areaId'),
      initiativeId: (req: NextRequest) => extractFromUrl(req.url, 'id') || extractFromBody(req, 'id'),
    },
  },
  
  // Area-related routes
  areas: {
    pattern: /^\/api\/areas/,
    handler: 'onAreaChange',
    extractors: {
      tenantId: (req: NextRequest) => req.headers.get('x-tenant-id') || extractFromUrl(req.url, 'tenantId'),
      areaId: (req: NextRequest) => extractFromUrl(req.url, 'id') || extractFromBody(req, 'id'),
    },
  },
  
  // User/profile routes
  users: {
    pattern: /^\/api\/(users|profile)/,
    handler: 'onUserChange',
    extractors: {
      tenantId: (req: NextRequest) => req.headers.get('x-tenant-id'),
      userId: (req: NextRequest) => extractFromUrl(req.url, 'userId') || extractFromBody(req, 'userId'),
    },
  },
  
  // Bulk operations
  bulk: {
    pattern: /^\/api\/(excel|bulk|import)/,
    handler: 'onTenantDataChange',
    extractors: {
      tenantId: (req: NextRequest) => req.headers.get('x-tenant-id'),
    },
  },
};

// Utility functions for parameter extraction
function extractFromUrl(url: string, param: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const paramIndex = pathSegments.findIndex(segment => segment === param);
    
    if (paramIndex !== -1 && paramIndex + 1 < pathSegments.length) {
      return pathSegments[paramIndex + 1];
    }
    
    return urlObj.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}

function extractFromBody(req: NextRequest, param: string): string | undefined {
  // This is a placeholder - actual implementation would need to parse the request body
  // In practice, you'd cache the parsed body or use a different approach
  return undefined;
}

// Cache invalidation tracking
class InvalidationTracker {
  private static stats = {
    totalInvalidations: 0,
    successfulInvalidations: 0,
    failedInvalidations: 0,
    avgInvalidationTime: 0,
    lastInvalidation: Date.now(),
  };

  static async trackInvalidation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    const startTime = Date.now();
    this.stats.totalInvalidations++;

    try {
      const result = await operation();
      this.stats.successfulInvalidations++;
      return result;
    } catch (error) {
      this.stats.failedInvalidations++;
      console.error(`[Cache Middleware] Invalidation failed for ${context}:`, error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.stats.avgInvalidationTime = 
        (this.stats.avgInvalidationTime + duration) / 2;
      this.stats.lastInvalidation = Date.now();
      
      if (DEFAULT_CONFIG.enableLogging) {
        console.log(`[Cache Middleware] Invalidation completed for ${context} (${duration}ms)`);
      }
    }
  }

  static getStats() {
    return { ...this.stats };
  }

  static reset() {
    this.stats = {
      totalInvalidations: 0,
      successfulInvalidations: 0,
      failedInvalidations: 0,
      avgInvalidationTime: 0,
      lastInvalidation: Date.now(),
    };
  }
}

// Main cache middleware class
export class CacheInvalidationMiddleware {
  private config: CacheMiddlewareConfig;

  constructor(config?: Partial<CacheMiddlewareConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Middleware function for Next.js API routes
   */
  async middleware(request: NextRequest): Promise<NextResponse | null> {
    // Only process mutation operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return null; // Continue without invalidation
    }

    const pathname = new URL(request.url).pathname;
    
    // Find matching pattern
    const matchedPattern = Object.entries(INVALIDATION_PATTERNS).find(
      ([_, config]) => config.pattern.test(pathname)
    );

    if (!matchedPattern) {
      return null; // No invalidation needed
    }

    const [patternName, patternConfig] = matchedPattern;

    try {
      // Extract parameters
      const params = await this.extractParameters(request, patternConfig.extractors);
      
      if (!params.tenantId) {
        console.warn(`[Cache Middleware] Missing tenantId for ${pathname}`);
        return null;
      }

      // Determine change type from method and path
      const changeType = this.determineChangeType(request.method, pathname);

      // Schedule invalidation (non-blocking)
      this.scheduleInvalidation(patternConfig.handler, {
        ...params,
        changeType,
      }, `${patternName}:${pathname}`);

    } catch (error) {
      console.error(`[Cache Middleware] Error processing ${pathname}:`, error);
    }

    return null; // Continue processing
  }

  /**
   * Extract parameters from request
   */
  private async extractParameters(
    request: NextRequest,
    extractors: Record<string, (req: NextRequest) => string | undefined>
  ): Promise<Record<string, string | undefined>> {
    const params: Record<string, string | undefined> = {};

    for (const [key, extractor] of Object.entries(extractors)) {
      try {
        params[key] = extractor(request);
      } catch (error) {
        console.warn(`[Cache Middleware] Failed to extract ${key}:`, error);
      }
    }

    return params;
  }

  /**
   * Determine change type from HTTP method and path
   */
  private determineChangeType(method: string, pathname: string): string {
    switch (method) {
      case 'POST':
        return pathname.includes('/bulk') || pathname.includes('/import') 
          ? 'bulk_import' : 'create';
      case 'PUT':
      case 'PATCH':
        return pathname.includes('/status') ? 'status_change' : 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'update';
    }
  }

  /**
   * Schedule cache invalidation asynchronously
   */
  private scheduleInvalidation(
    handlerName: string,
    params: Record<string, any>,
    context: string
  ): void {
    // Use setTimeout to make it non-blocking
    setTimeout(async () => {
      await this.executeInvalidation(handlerName, params, context);
    }, 0);
  }

  /**
   * Execute cache invalidation with retries
   */
  private async executeInvalidation(
    handlerName: string,
    params: Record<string, any>,
    context: string
  ): Promise<void> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.config.maxRetries) {
      try {
        await InvalidationTracker.trackInvalidation(async () => {
          // Execute invalidation with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Invalidation timeout')), this.config.timeoutMs);
          });

          const invalidationPromise = this.callInvalidationHandler(handlerName, params);

          await Promise.race([invalidationPromise, timeoutPromise]);
        }, context);

        return; // Success - exit retry loop
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts < this.config.maxRetries) {
          const delay = Math.pow(2, attempts) * 100; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(
      `[Cache Middleware] Failed to invalidate cache after ${attempts} attempts for ${context}:`,
      lastError
    );
  }

  /**
   * Call the appropriate invalidation handler
   */
  private async callInvalidationHandler(
    handlerName: string,
    params: Record<string, any>
  ): Promise<void> {
    switch (handlerName) {
      case 'onInitiativeChange':
        if (params.tenantId) {
          await CacheInvalidationManager.onInitiativeChange(params as any);
        }
        break;
      case 'onAreaChange':
        if (params.tenantId && params.areaId) {
          await CacheInvalidationManager.onAreaChange(params as any);
        }
        break;
      case 'onUserChange':
        if (params.tenantId && params.userId) {
          await CacheInvalidationManager.onUserChange(params as any);
        }
        break;
      case 'onTenantDataChange':
        await CacheInvalidationManager.onTenantDataChange(
          params.tenantId,
          params.changeType
        );
        break;
      default:
        throw new Error(`Unknown invalidation handler: ${handlerName}`);
    }
  }

  /**
   * Get middleware statistics
   */
  getStats() {
    return {
      config: this.config,
      invalidationStats: InvalidationTracker.getStats(),
    };
  }
}

// Singleton middleware instance
export const cacheMiddleware = new CacheInvalidationMiddleware();

// Next.js middleware wrapper
export async function withCacheInvalidation(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Process the request normally first
  const response = await next();

  // Only invalidate cache on successful mutations
  if (response.ok && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    await cacheMiddleware.middleware(request);
  }

  return response;
}

// React hook for middleware statistics
export function useCacheMiddlewareStats() {
  return cacheMiddleware.getStats();
}

// Manual invalidation triggers for direct use
export class ManualCacheInvalidation {
  /**
   * Manually trigger cache invalidation for initiatives
   */
  static async invalidateInitiative(params: {
    tenantId: string;
    areaId?: string;
    initiativeId?: string;
    changeType?: 'create' | 'update' | 'delete' | 'status_change';
  }) {
    await CacheInvalidationManager.onInitiativeChange(params);
  }

  /**
   * Manually trigger cache invalidation for areas
   */
  static async invalidateArea(params: {
    tenantId: string;
    areaId: string;
    changeType?: 'create' | 'update' | 'delete' | 'manager_change';
  }) {
    await CacheInvalidationManager.onAreaChange(params);
  }

  /**
   * Manually trigger cache invalidation for users
   */
  static async invalidateUser(params: {
    tenantId: string;
    userId: string;
    changeType?: 'role_change' | 'area_assignment' | 'permissions_change';
  }) {
    await CacheInvalidationManager.onUserChange(params);
  }

  /**
   * Manually trigger full tenant cache invalidation
   */
  static async invalidateTenant(
    tenantId: string,
    reason?: 'bulk_import' | 'configuration_change' | 'user_role_change' | 'data_migration'
  ) {
    await CacheInvalidationManager.onTenantDataChange(tenantId, reason);
  }
}

// Export types
export type {
  CacheMiddlewareConfig,
};