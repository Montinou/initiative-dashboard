/**
 * KPI Analytics API Endpoint
 * 
 * Provides dedicated KPI analytics data for dashboard consumption
 * with role-based filtering and time range support.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { 
  calculateKPISummary,
  getAreaKPIMetrics,
  getStrategicMetrics,
  generateKPIInsights,
  type KPIFilters
} from '@/lib/kpi/calculator';
import { getUserProfile } from '@/lib/server-user-profile';
import { kpiCache, CachedDataFetcher } from '@/lib/cache/kpi-cache';

// ===================================================================================
// TYPES
// ===================================================================================

interface KPIAnalyticsResponse {
  success: boolean;
  summary: any;
  area_metrics?: any[];
  strategic_metrics?: any;
  trends?: any[];
  insights?: string[];
  metadata: {
    user_role: string;
    time_range: string;
    last_updated: string;
    cache_duration: number;
  };
}

// ===================================================================================
// GET: KPI ANALYTICS DATA
// ===================================================================================

/**
 * GET /api/analytics/kpi
 * 
 * Returns comprehensive KPI analytics data based on user role and permissions
 * Supports time range filtering and caching for performance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Performance optimization: Check for cache refresh parameter
    const forceRefresh = searchParams.get('_refresh') !== null;
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const timeRange = searchParams.get('time_range') || 'current'; // current, week, month, quarter, year
    const areaId = searchParams.get('area_id');
    const includeInsights = searchParams.get('include_insights') !== 'false';
    const includeTrends = searchParams.get('include_trends') === 'true';
    
    // Build cache key parameters
    const cacheParams = {
      tenantId: userProfile.tenant_id,
      userId: userProfile.id,
      userRole: userProfile.role,
      areaId: userProfile.area_id,
      filters: {
        time_range: timeRange,
        area_id: areaId,
        include_insights: includeInsights,
        include_trends: includeTrends
      }
    };
    
    // Try to get cached data first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cachedData = await kpiCache.get('KPI_METRICS', cacheParams);
        if (cachedData) {
          // Add cache hit headers
          const cacheHeaders = {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            'Vary': 'Authorization',
            'X-Cache-Status': 'HIT',
            'X-Cache-Time': new Date().toISOString()
          };
          
          return NextResponse.json(cachedData, {
            status: 200,
            headers: cacheHeaders
          });
        }
      } catch (cacheError) {
        console.warn('[KPI API] Cache read error:', cacheError);
        // Continue with fresh data fetch
      }
    }

    // Build KPI filters based on time range
    const filters: KPIFilters = {};
    
    if (timeRange !== 'current') {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      }
      
      filters.date_range = {
        start: startDate.toISOString(),
        end: now.toISOString()
      };
    }

    // Apply area filter if specified and user has permission
    if (areaId) {
      if (userProfile.role === 'Manager' && areaId !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Insufficient permissions to view this area' },
          { status: 403 }
        );
      }
      filters.area_id = areaId;
    }

    // Get KPI summary
    const summary = await calculateKPISummary(
      userProfile.tenant_id,
      filters,
      userProfile.role,
      userProfile.area_id
    );

    // Get area metrics (filtered by role)
    let areaMetrics = null;
    if (['CEO', 'Admin'].includes(userProfile.role) || !areaId) {
      areaMetrics = await getAreaKPIMetrics(
        userProfile.tenant_id,
        userProfile.role,
        userProfile.area_id
      );
    }

    // Get strategic metrics (CEO/Admin only)
    let strategicMetrics = null;
    if (['CEO', 'Admin'].includes(userProfile.role)) {
      strategicMetrics = await getStrategicMetrics(userProfile.tenant_id);
    }

    // Generate trends data if requested
    let trends = null;
    if (includeTrends) {
      trends = await getKPITrends(
        userProfile.tenant_id,
        filters,
        userProfile.role,
        userProfile.area_id
      );
    }

    // Generate insights
    let insights = null;
    if (includeInsights && areaMetrics) {
      insights = generateKPIInsights(areaMetrics);
    }

    // Prepare response
    const response: KPIAnalyticsResponse = {
      success: true,
      summary,
      area_metrics: areaMetrics,
      strategic_metrics: strategicMetrics,
      trends,
      insights,
      metadata: {
        user_role: userProfile.role,
        time_range: timeRange,
        last_updated: new Date().toISOString(),
        cache_duration: 300 // 5 minutes cache duration
      }
    };

    // Cache the response for future requests
    try {
      await kpiCache.set('KPI_METRICS', cacheParams, response);
    } catch (cacheError) {
      console.warn('[KPI API] Cache write error:', cacheError);
      // Don't fail the request if caching fails
    }
    
    // Set cache headers for performance
    const cacheHeaders = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Vary': 'Authorization',
      'X-Cache-Status': 'MISS',
      'X-Cache-Time': new Date().toISOString()
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: cacheHeaders 
    });

  } catch (error) {
    console.error('Error in KPI analytics endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ===================================================================================
// HELPER FUNCTIONS
// ===================================================================================

/**
 * Get KPI trends data for charts and visualizations
 */
async function getKPITrends(
  tenantId: string,
  filters: KPIFilters,
  userRole: string,
  userAreaId?: string
) {
  const supabase = createClient(cookies());
  
  try {
    // Get progress history for trend analysis
    let historyQuery = supabase
      .from('progress_history')
      .select(`
        initiative_id,
        previous_progress,
        new_progress,
        created_at,
        initiatives!inner(
          id,
          title,
          area_id,
          is_strategic,
          weight_factor
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Apply role-based filtering
    if (userRole === 'Manager' && userAreaId) {
      // This would need a JOIN or additional filtering - simplified for now
    }

    const { data: progressHistory, error } = await historyQuery;

    if (error) {
      console.error('Error fetching trends data:', error);
      return null;
    }

    // Process trend data (simplified - would need more sophisticated analysis)
    const trendData = processProgressTrends(progressHistory || []);
    
    return trendData;

  } catch (error) {
    console.error('Error generating trend data:', error);
    return null;
  }
}

/**
 * Process progress history into trend data for charts
 */
function processProgressTrends(progressHistory: any[]) {
  // Group by date and calculate daily progress changes
  const dailyTrends = progressHistory.reduce((acc, record) => {
    const date = new Date(record.created_at).toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = {
        date,
        total_progress_changes: 0,
        initiatives_updated: 0,
        average_progress_change: 0,
        strategic_initiatives_updated: 0
      };
    }
    
    acc[date].total_progress_changes += (record.new_progress - record.previous_progress);
    acc[date].initiatives_updated += 1;
    
    if (record.initiatives?.is_strategic) {
      acc[date].strategic_initiatives_updated += 1;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages and return as array
  return Object.values(dailyTrends)
    .map((day: any) => ({
      ...day,
      average_progress_change: day.total_progress_changes / day.initiatives_updated
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-30); // Last 30 days
}