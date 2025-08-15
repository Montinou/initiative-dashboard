/**
 * Trends Analytics API Endpoint
 * 
 * Provides time-series trend data for KPI analytics and dashboard charts
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getUserProfile } from '@/lib/server-user-profile';

// ===================================================================================
// TYPES
// ===================================================================================

interface TrendDataPoint {
  date: string;
  total_initiatives: number;
  completed_initiatives: number;
  average_progress: number;
  strategic_progress: number;
  overdue_count: number;
  budget_utilization: number;
}

// ===================================================================================
// GET: TRENDS DATA
// ===================================================================================

/**
 * GET /api/analytics/trends
 * 
 * Returns time-series trend data for KPI dashboards
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user profile
    const { user, userProfile } = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse parameters
    const timeRange = searchParams.get('time_range') || '30'; // days
    const granularity = searchParams.get('granularity') || 'daily'; // daily, weekly, monthly
    const areaId = searchParams.get('area_id');
    const metric = searchParams.get('metric') || 'all'; // all, progress, completion, strategic

    // Role-based filtering
    if (userProfile.role === 'Manager' && areaId && areaId !== userProfile.area_id) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view this area' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get historical progress data
    const trendData = await generateTrendData(
      supabase,
      userProfile.tenant_id,
      startDate,
      endDate,
      granularity,
      areaId,
      userProfile.role,
      userProfile.area_id
    );

    return NextResponse.json({
      success: true,
      trends: trendData,
      metadata: {
        time_range: timeRange,
        granularity,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        area_filter: areaId,
        user_role: userProfile.role
      }
    });

  } catch (error) {
    console.error('Error in trends analytics endpoint:', error);
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

async function generateTrendData(
  supabase: any,
  tenantId: string,
  startDate: Date,
  endDate: Date,
  granularity: string,
  areaId?: string,
  userRole?: string,
  userAreaId?: string
): Promise<TrendDataPoint[]> {
  
  // Generate date series based on granularity
  const dates = generateDateSeries(startDate, endDate, granularity);
  const trendData: TrendDataPoint[] = [];

  for (const date of dates) {
    // Get snapshot data for this date
    const snapshot = await getKPISnapshotForDate(
      supabase,
      tenantId,
      date,
      areaId,
      userRole,
      userAreaId
    );
    
    trendData.push({
      date: date.toISOString().split('T')[0],
      ...snapshot
    });
  }

  return trendData;
}

function generateDateSeries(startDate: Date, endDate: Date, granularity: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    
    switch (granularity) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        current.setDate(current.getDate() + 1);
    }
  }
  
  return dates;
}

async function getKPISnapshotForDate(
  supabase: any,
  tenantId: string,
  date: Date,
  areaId?: string,
  userRole?: string,
  userAreaId?: string
) {
  // Build query for initiatives as of this date
  let query = supabase
    .from('initiatives')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lte('created_at', date.toISOString());

  // Apply area filtering
  if (areaId) {
    query = query.eq('area_id', areaId);
  } else if (userRole === 'Manager' && userAreaId) {
    query = query.eq('area_id', userAreaId);
  }

  const { data: initiatives, error } = await query;

  if (error) {
    console.error('Error fetching historical data:', error);
    return {
      total_initiatives: 0,
      completed_initiatives: 0,
      average_progress: 0,
      strategic_progress: 0,
      overdue_count: 0,
      budget_utilization: 0
    };
  }

  // Calculate metrics for this snapshot
  const totalInitiatives = initiatives?.length || 0;
  const completedInitiatives = initiatives?.filter(i => 
    i.status === 'completed' && 
    (!i.completion_date || new Date(i.completion_date) <= date)
  ).length || 0;

  const averageProgress = totalInitiatives > 0 
    ? Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives)
    : 0;

  const strategicInitiatives = initiatives?.filter(i => i.is_strategic) || [];
  const strategicProgress = strategicInitiatives.length > 0
    ? Math.round(strategicInitiatives.reduce((sum, i) => sum + i.progress, 0) / strategicInitiatives.length)
    : 0;

  const overdueCount = initiatives?.filter(i => 
    i.target_date && 
    new Date(i.target_date) < date && 
    i.status !== 'completed'
  ).length || 0;

  const totalBudget = initiatives?.reduce((sum, i) => sum + (i.budget || 0), 0) || 0;
  const totalActualCost = initiatives?.reduce((sum, i) => sum + (i.actual_cost || 0), 0) || 0;
  const budgetUtilization = totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0;

  return {
    total_initiatives: totalInitiatives,
    completed_initiatives: completedInitiatives,
    average_progress: averageProgress,
    strategic_progress: strategicProgress,
    overdue_count: overdueCount,
    budget_utilization: budgetUtilization
  };
}