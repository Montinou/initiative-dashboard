export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';

interface TrendDataPoint {
  date: string;
  overallProgress: number;
  completedInitiatives: number;
  newInitiatives: number;
  atRiskInitiatives: number;
}

// Constants for trend calculations
const AT_RISK_THRESHOLD_DAYS = 30;
const BASE_COMPLETED = 8;
const COMPLETED_INCREMENT = 2;
const BASE_IN_PROGRESS = 15;
const IN_PROGRESS_VARIATION = 3;
const BASE_AT_RISK = 5;
const AT_RISK_RANDOM_FACTOR = 3;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile (secure pattern)
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '3months';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const areasParam = searchParams.get('areas');
    const selectedAreas = areasParam ? areasParam.split(',') : [];
    
    // Calculate date range based on period
    const now = new Date();
    let periodStart = new Date();
    
    switch (period) {
      case '1month':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        periodStart.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        periodStart.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        periodStart.setFullYear(now.getFullYear() - 1);
        break;
      default:
        periodStart.setMonth(now.getMonth() - 3);
    }
    
    // Override with custom date range if provided
    if (startDate) periodStart = new Date(startDate);
    const periodEnd = endDate ? new Date(endDate) : now;

    // Fetch initiatives with creation/completion dates for the tenant
    let query = supabase
      .from('initiatives')
      .select('id, status, progress, created_at, completion_date, updated_at, area_id, start_date, due_date')
      
      .gte('created_at', periodStart.toISOString());
    
    // Apply area filter
    if (selectedAreas.length > 0) {
      query = query.in('area_id', selectedAreas);
    }
    
    const { data: initiatives, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Generate data points based on period
    const dataPoints = [];
    const timeDiff = periodEnd.getTime() - periodStart.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Determine sampling interval
    let intervalDays = 1;
    if (daysDiff > 90) intervalDays = 7; // Weekly for periods > 3 months
    if (daysDiff > 180) intervalDays = 14; // Bi-weekly for periods > 6 months
    if (daysDiff > 365) intervalDays = 30; // Monthly for periods > 1 year
    
    for (let date = new Date(periodStart); date <= periodEnd; date.setDate(date.getDate() + intervalDays)) {
      dataPoints.push(new Date(date));
    }

    // Calculate statistics for each data point
    const trendData: TrendDataPoint[] = dataPoints.map(pointDate => {
      // Initiatives active up to this point
      const activeInitiatives = initiatives?.filter((initiative: any) => {
        const createdDate = new Date(initiative.created_at);
        return createdDate <= pointDate;
      }) || [];

      // Calculate overall progress
      const overallProgress = activeInitiatives.length > 0
        ? Math.round(activeInitiatives.reduce((sum: number, i: any) => sum + (i.progress || 0), 0) / activeInitiatives.length)
        : 0;

      // Count completed initiatives up to this point
      const completedInitiatives = activeInitiatives.filter((initiative: any) => {
        if (initiative.status !== 'completed') return false;
        const completionDate = initiative.completion_date ? new Date(initiative.completion_date) : null;
        return completionDate && completionDate <= pointDate;
      }).length;

      // Count new initiatives created in the last interval
      const intervalStart = new Date(pointDate);
      intervalStart.setDate(intervalStart.getDate() - intervalDays);
      const newInitiatives = activeInitiatives.filter((initiative: any) => {
        const createdDate = new Date(initiative.created_at);
        return createdDate >= intervalStart && createdDate <= pointDate;
      }).length;

      // Define "at risk" as initiatives that are overdue or on hold
      const atRiskInitiatives = activeInitiatives.filter((initiative: any) => {
        if (initiative.status === 'on_hold') return true;
        if (initiative.status === 'in_progress' && initiative.due_date) {
          const dueDate = new Date(initiative.due_date);
          return dueDate < pointDate;
        }
        return false;
      }).length;

      return {
        date: pointDate.toISOString(),
        overallProgress,
        completedInitiatives,
        newInitiatives,
        atRiskInitiatives
      };
    });

    // Handle empty state
    if (!initiatives || initiatives.length === 0) {
      const emptyTrendData: TrendDataPoint[] = dataPoints.map(pointDate => ({
        date: pointDate.toISOString(),
        overallProgress: 0,
        completedInitiatives: 0,
        newInitiatives: 0,
        atRiskInitiatives: 0
      }));

      return NextResponse.json({
        data: emptyTrendData,
        total_initiatives: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          period,
          data_source: 'initiatives table'
        }
      });
    }

    return NextResponse.json({
      data: trendData,
      total_initiatives: initiatives.length,
      timestamp: new Date().toISOString(),
      metadata: {
        period,
        data_source: 'initiatives table',
        data_points: dataPoints.length,
        interval_days: intervalDays
      }
    });

  } catch (error) {
    console.error('Trend analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}