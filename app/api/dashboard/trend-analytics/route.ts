export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

interface TrendDataPoint {
  mes: string;
  completadas: number;
  enProgreso: number;
  enRiesgo: number;
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
    // Get tenant ID from custom header (sent by frontend from local storage)
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Validate authorization token is present
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Get the last 6 months of data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Fetch initiatives with creation/completion dates for the tenant
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('status, created_at, completion_date, updated_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Generate the last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date: monthDate,
        label: monthDate.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
      });
    }

    // Calculate monthly statistics
    const trendData: TrendDataPoint[] = months.map(month => {
      const monthStart = new Date(month.date.getFullYear(), month.date.getMonth(), 1);
      const monthEnd = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0);

      // Count initiatives by status at the end of each month
      const initiativesInMonth = initiatives?.filter((initiative: any) => {
        const createdDate = new Date(initiative.created_at);
        return createdDate <= monthEnd;
      }) || [];

      const completedInMonth = initiativesInMonth.filter((initiative: any) => {
        const completionDate = initiative.completion_date ? new Date(initiative.completion_date) : null;
        return initiative.status === 'completed' && 
               completionDate && 
               completionDate >= monthStart && 
               completionDate <= monthEnd;
      }).length;

      const inProgressInMonth = initiativesInMonth.filter((initiative: any) => 
        initiative.status === 'in_progress'
      ).length;

      // Define "at risk" as initiatives that have been in progress for more than 30 days
      // or are on hold
      const thirtyDaysAgo = new Date(monthEnd);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - AT_RISK_THRESHOLD_DAYS);
      
      const atRiskInMonth = initiativesInMonth.filter((initiative: any) => {
        if (initiative.status === 'on_hold') return true;
        if (initiative.status === 'in_progress') {
          const updatedDate = new Date(initiative.updated_at);
          return updatedDate < thirtyDaysAgo;
        }
        return false;
      }).length;

      return {
        mes: month.label,
        completadas: completedInMonth,
        enProgreso: inProgressInMonth,
        enRiesgo: atRiskInMonth
      };
    });

    // Handle empty state - return realistic baseline data
    if (!initiatives || initiatives.length === 0) {
      const emptyTrendData: TrendDataPoint[] = months.map(month => ({
        mes: month.label,
        completadas: 0,
        enProgreso: 0,
        enRiesgo: 0
      }));

      return NextResponse.json({
        data: emptyTrendData,
        total_initiatives: 0,
        timestamp: new Date().toISOString(),
        metadata: {
          period: '6 months',
          data_source: 'initiatives table'
        }
      });
    }

    return NextResponse.json({
      data: trendData,
      total_initiatives: initiatives.length,
      timestamp: new Date().toISOString(),
      metadata: {
        period: '6 months',
        data_source: 'initiatives table',
        months_analyzed: months.length
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