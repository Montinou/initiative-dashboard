export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { cookies } from 'next/headers';

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
    // Authenticate user and get profile (secure pattern)
    const { user, userProfile } = await getUserProfile(request);
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create Supabase client
    const supabase = await createClient();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const areasParam = searchParams.get('areas');
    const selectedAreas = areasParam ? areasParam.split(',') : [];
    const statusParam = searchParams.get('status');
    const selectedStatus = statusParam ? statusParam.split(',') : [];

    // Fetch initiatives with full details for the tenant
    let query = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        status,
        progress,
        area_id,
        start_date,
        due_date,
        areas!initiatives_area_id_fkey (
          name
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);
    
    // Apply date filters
    if (startDate) {
      query = query.gte('start_date', startDate);
    }
    if (endDate) {
      query = query.lte('due_date', endDate);
    }
    
    // Apply area filter
    if (selectedAreas.length > 0) {
      query = query.in('area_id', selectedAreas);
    }
    
    // Apply status filter
    if (selectedStatus.length > 0) {
      query = query.in('status', selectedStatus);
    }
    
    const { data: initiatives, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Handle empty state
    if (!initiatives || initiatives.length === 0) {
      return NextResponse.json({
        data: [],
        total_initiatives: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Transform initiatives data to match frontend expectations
    const transformedData = initiatives.map(initiative => ({
      id: initiative.id,
      name: initiative.title,
      status: initiative.status,
      progress: initiative.progress || 0,
      area: initiative.areas?.name || 'Unknown Area'
    }));

    return NextResponse.json({
      data: transformedData,
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