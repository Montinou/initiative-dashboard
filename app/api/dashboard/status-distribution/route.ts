import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/lib/auth-utils';
import { getThemeFromDomain } from '@/lib/theme-config';

const STATUS_COLORS = {
  'planning': '#f59e0b',
  'in_progress': '#06b6d4',
  'completed': '#10b981',
  'on_hold': '#ef4444',
};

const STATUS_LABELS = {
  'planning': 'Planning',
  'in_progress': 'In Progress',
  'completed': 'Completed',
  'on_hold': 'On Hold',
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get domain-based tenant ID
    const host = request.headers.get('host') || '';
    const domainTheme = await getThemeFromDomain(host);
    const tenantId = domainTheme.tenantId;

    // Fetch initiatives with status for the tenant
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('status')
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Handle empty state
    if (!initiatives || initiatives.length === 0) {
      return NextResponse.json({
        data: [
          { status: 'Planning', statusKey: 'planning', count: 0, percentage: 0, color: '#f59e0b' },
          { status: 'In Progress', statusKey: 'in_progress', count: 0, percentage: 0, color: '#06b6d4' },
          { status: 'Completed', statusKey: 'completed', count: 0, percentage: 0, color: '#10b981' },
          { status: 'On Hold', statusKey: 'on_hold', count: 0, percentage: 0, color: '#ef4444' }
        ],
        total_initiatives: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Calculate status distribution using correct schema statuses
    const statusCounts = {
      'planning': 0,
      'in_progress': 0,
      'completed': 0,
      'on_hold': 0
    };

    initiatives.forEach(initiative => {
      if (initiative.status in statusCounts) {
        statusCounts[initiative.status as keyof typeof statusCounts]++;
      }
    });

    const distribution = Object.entries(statusCounts).map(([status, count]) => {
      const percentage = initiatives.length > 0 
        ? Math.round((count / initiatives.length) * 100) 
        : 0;

      return {
        status: STATUS_LABELS[status as keyof typeof STATUS_LABELS],
        statusKey: status,
        count,
        percentage,
        color: STATUS_COLORS[status as keyof typeof STATUS_COLORS]
      };
    });

    return NextResponse.json({
      data: distribution,
      total_initiatives: initiatives.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Status distribution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}