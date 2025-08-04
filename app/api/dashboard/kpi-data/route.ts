/**
 * Enhanced KPI Dashboard Data API with Redis Caching
 * 
 * Demonstrates PERF-002 caching strategy implementation:
 * - Multi-layer cache lookup (Redis -> Memory -> localStorage)
 * - Role-based cache keys for security
 * - Automatic cache invalidation
 * - Performance monitoring
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-002 Caching Strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import { CachedDataFetcher } from '@/lib/cache/kpi-cache';
import { ManualCacheInvalidation } from '@/lib/cache/cache-middleware';
import { calculateKPISummary, getAreaKPIMetrics } from '@/lib/kpi/calculator';
// Define UserRole type here to avoid import issues
type UserRole = 'CEO' | 'Manager' | 'Analyst';

// API Response interface
interface KPIDashboardResponse {
  summary: any;
  areaMetrics: any[];
  lastUpdated: string;
  cacheInfo: {
    cached: boolean;
    source: 'memory' | 'redis' | 'localStorage' | 'api';
    ttl: number;
    hitRate: number;
  };
}

/**
 * GET /api/dashboard/kpi-data
 * Fetch KPI dashboard data with caching
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters
    const tenantId = request.headers.get('x-tenant-id') || searchParams.get('tenantId');
    const userId = request.headers.get('x-user-id') || searchParams.get('userId');
    const userRole = (request.headers.get('x-user-role') || searchParams.get('userRole')) as UserRole;
    const areaId = searchParams.get('areaId') || undefined;
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    const useWarmCache = searchParams.get('useWarmCache') === 'true';

    // Validation
    if (!tenantId || !userId || !userRole) {
      return NextResponse.json(
        { error: 'Missing required parameters: tenantId, userId, userRole' },
        { status: 400 }
      );
    }

    // Try cached data first
    const startTime = Date.now();
    let cacheInfo = {
      cached: false,
      source: 'api' as const,
      ttl: 0,
      hitRate: 0,
    };

    try {
      const cachedData = await CachedDataFetcher.getDashboardData({
        tenantId,
        userId,
        userRole,
        areaId,
        forceRefresh,
        useWarmCache,
      });

      if (cachedData && !forceRefresh) {
        const { kpiCache } = await import('@/lib/cache/kpi-cache');
        const stats = kpiCache.getStats();
        
        cacheInfo = {
          cached: true,
          source: 'redis' as const,
          ttl: 300, // 5 minutes default
          hitRate: stats.totalHitRate,
        };

        const response: KPIDashboardResponse = {
          ...cachedData,
          cacheInfo,
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'private, max-age=300',
            'X-Cache-Status': 'HIT',
            'X-Response-Time': `${Date.now() - startTime}ms`,
          },
        });
      }
    } catch (cacheError) {
      console.warn('[KPI API] Cache lookup failed, falling back to database:', cacheError);
    }

    // Fetch fresh data from database
    console.log('[KPI API] Fetching fresh data from database');
    
    const [summary, areaMetrics] = await Promise.all([
      calculateKPISummary(tenantId, {}, userRole, areaId),
      getAreaKPIMetrics(tenantId, userRole, areaId),
    ]);

    const freshData = {
      summary,
      areaMetrics,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the fresh data
    try {
      const { kpiCache } = await import('@/lib/cache/kpi-cache');
      await kpiCache.set('DASHBOARD_DATA', {
        tenantId,
        userId,
        userRole,
        areaId,
      }, freshData);

      const stats = kpiCache.getStats();
      cacheInfo.hitRate = stats.totalHitRate;
    } catch (cacheError) {
      console.warn('[KPI API] Failed to cache fresh data:', cacheError);
    }

    const response: KPIDashboardResponse = {
      ...freshData,
      cacheInfo,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Cache-Status': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error('[KPI API] Error fetching dashboard data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/kpi-data
 * Fetch KPI dashboard data with filters
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { tenantId, userId, userRole, areaId, filters, forceRefresh, useWarmCache } = body;

    // Validation
    if (!tenantId || !userRole) {
      return NextResponse.json(
        { error: 'Missing required parameters: tenantId, userRole' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let cacheInfo = {
      cached: false,
      source: 'api' as const,
      ttl: 0,
      hitRate: 0,
    };

    // Try cached data with filters
    try {
      const cachedData = await CachedDataFetcher.getDashboardData({
        tenantId,
        userId: userId || 'system',
        userRole,
        areaId,
        filters,
        forceRefresh,
        useWarmCache,
      });

      if (cachedData && !forceRefresh) {
        const { kpiCache } = await import('@/lib/cache/kpi-cache');
        const stats = kpiCache.getStats();
        
        cacheInfo = {
          cached: true,
          source: 'redis' as const,
          ttl: 300,
          hitRate: stats.totalHitRate,
        };

        const response: KPIDashboardResponse = {
          ...cachedData,
          cacheInfo,
        };

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'private, max-age=300',
            'X-Cache-Status': 'HIT',
            'X-Response-Time': `${Date.now() - startTime}ms`,
          },
        });
      }
    } catch (cacheError) {
      console.warn('[KPI API] Cache lookup failed:', cacheError);
    }

    // Fetch fresh data
    const [summary, areaMetrics] = await Promise.all([
      calculateKPISummary(tenantId, filters, userRole, areaId),
      getAreaKPIMetrics(tenantId, userRole, areaId),
    ]);

    const freshData = {
      summary,
      areaMetrics,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    try {
      const { kpiCache } = await import('@/lib/cache/kpi-cache');
      await kpiCache.set('DASHBOARD_DATA', {
        tenantId,
        userId: userId || 'system',
        userRole,
        areaId,
        filters,
      }, freshData);

      const stats = kpiCache.getStats();
      cacheInfo.hitRate = stats.totalHitRate;
    } catch (cacheError) {
      console.warn('[KPI API] Failed to cache data:', cacheError);
    }

    const response: KPIDashboardResponse = {
      ...freshData,
      cacheInfo,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300',
        'X-Cache-Status': 'MISS',
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error('[KPI API] Error in POST request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/kpi-data
 * Manual cache invalidation endpoint
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id') || searchParams.get('tenantId');
    const areaId = searchParams.get('areaId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const scope = searchParams.get('scope') || 'dashboard'; // dashboard, area, user, tenant

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing required parameter: tenantId' },
        { status: 400 }
      );
    }

    let invalidatedCount = 0;

    switch (scope) {
      case 'dashboard':
        await ManualCacheInvalidation.invalidateInitiative({
          tenantId,
          areaId,
          changeType: 'update',
        });
        invalidatedCount = 1;
        break;
        
      case 'area':
        if (!areaId) {
          return NextResponse.json(
            { error: 'Missing required parameter: areaId for area scope' },
            { status: 400 }
          );
        }
        await ManualCacheInvalidation.invalidateArea({
          tenantId,
          areaId,
          changeType: 'update',
        });
        invalidatedCount = 1;
        break;
        
      case 'user':
        if (!userId) {
          return NextResponse.json(
            { error: 'Missing required parameter: userId for user scope' },
            { status: 400 }
          );
        }
        await ManualCacheInvalidation.invalidateUser({
          tenantId,
          userId,
          changeType: 'permissions_change',
        });
        invalidatedCount = 1;
        break;
        
      case 'tenant':
        await ManualCacheInvalidation.invalidateTenant(tenantId, 'configuration_change');
        invalidatedCount = 1;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid scope. Use: dashboard, area, user, or tenant' },
          { status: 400 }
        );
    }

    // Get updated cache stats
    const { kpiCache } = await import('@/lib/cache/kpi-cache');
    const stats = kpiCache.getStats();

    return NextResponse.json({
      message: 'Cache invalidation completed',
      scope,
      invalidatedCount,
      stats: {
        hitRate: stats.totalHitRate,
        memoryEntries: stats.memoryEntries,
        redisConnected: stats.redisConnectionStatus === 'connected',
      },
    });

  } catch (error) {
    console.error('[KPI API] Cache invalidation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Cache invalidation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}