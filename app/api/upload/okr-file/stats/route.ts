import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Get import statistics
 * GET /api/upload/okr-file/stats
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for tenant context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, role, area_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
    }

    // Get overall statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('okr_import_jobs')
      .select('status, total_rows, success_rows, error_rows, file_size_bytes');

    if (jobsError) {
      console.error('Error fetching stats:', jobsError);
      return NextResponse.json({ 
        error: 'Failed to fetch statistics',
        details: jobsError.message 
      }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      totalJobs: jobs?.length || 0,
      byStatus: {} as Record<string, number>,
      totalRowsProcessed: 0,
      totalSuccessRows: 0,
      totalErrorRows: 0,
      totalFileSizeBytes: 0,
      averageSuccessRate: 0,
      recentActivity: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0
      }
    };

    // Process job statistics
    if (jobs && jobs.length > 0) {
      jobs.forEach(job => {
        // Count by status
        stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
        
        // Sum totals
        stats.totalRowsProcessed += job.total_rows || 0;
        stats.totalSuccessRows += job.success_rows || 0;
        stats.totalErrorRows += job.error_rows || 0;
        stats.totalFileSizeBytes += job.file_size_bytes || 0;
      });

      // Calculate average success rate
      if (stats.totalRowsProcessed > 0) {
        stats.averageSuccessRate = Math.round(
          (stats.totalSuccessRows / stats.totalRowsProcessed) * 100
        );
      }
    }

    // Get recent activity counts
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { count: last24Hours } = await supabase
      .from('okr_import_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());

    const { count: last7Days } = await supabase
      .from('okr_import_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    const { count: last30Days } = await supabase
      .from('okr_import_jobs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    stats.recentActivity = {
      last24Hours: last24Hours || 0,
      last7Days: last7Days || 0,
      last30Days: last30Days || 0
    };

    // Get top errors if user is admin
    let topErrors = [];
    if (profile.role === 'Admin' || profile.role === 'CEO') {
      const { data: errors } = await supabase
        .from('okr_import_job_items')
        .select('error_message')
        .eq('status', 'error')
        .limit(100);

      if (errors && errors.length > 0) {
        const errorCounts = errors.reduce((acc: Record<string, number>, item) => {
          const msg = item.error_message || 'Unknown error';
          acc[msg] = (acc[msg] || 0) + 1;
          return acc;
        }, {});

        topErrors = Object.entries(errorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([message, count]) => ({ message, count }));
      }
    }

    return NextResponse.json({
      stats,
      topErrors
    });

  } catch (error) {
    console.error('Error in stats endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}