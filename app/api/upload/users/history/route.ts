import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!['Admin', 'CEO'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = supabase
      .from('user_import_jobs')
      .select(`
        *,
        imported_by_profile:user_profiles!user_import_jobs_imported_by_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: jobs, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get statistics for each job
    const jobsWithStats = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: items } = await supabase
          .from('user_import_job_items')
          .select('status, action')
          .eq('job_id', job.id);

        const stats = {
          created: items?.filter(i => i.action === 'create').length || 0,
          updated: items?.filter(i => i.action === 'update').length || 0,
          skipped: items?.filter(i => i.action === 'skip').length || 0,
          errors: items?.filter(i => i.status === 'error').length || 0,
        };

        return {
          ...job,
          statistics: stats
        };
      })
    );

    return NextResponse.json({
      jobs: jobsWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('User import history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch import history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}