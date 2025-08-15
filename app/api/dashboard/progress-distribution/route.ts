export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const areasParam = searchParams.get('areas');
    const selectedAreas = areasParam ? areasParam.split(',') : [];

    // Fetch all initiatives with detailed information for the tenant
    let query = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        status,
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
        distribution: [
          { range: '0-25%', count: 0, percentage: 0 },
          { range: '26-50%', count: 0, percentage: 0 },
          { range: '51-75%', count: 0, percentage: 0 },
          { range: '76-100%', count: 0, percentage: 0 }
        ],
        total_initiatives: 0,
        average_progress: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare detailed initiative data for frontend
    const initiativesData = initiatives.map(initiative => ({
      id: initiative.id,
      title: initiative.title,
      progress: initiative.progress || 0,
      status: initiative.status,
      area: initiative.areas?.name || 'Unknown Area'
    }));

    // Calculate progress distribution
    const ranges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 26, max: 50, label: '26-50%' },
      { min: 51, max: 75, label: '51-75%' },
      { min: 76, max: 100, label: '76-100%' }
    ];

    const distribution = ranges.map(range => {
      const count = initiatives.filter(initiative => 
        initiative.progress >= range.min && initiative.progress <= range.max
      ).length;
      
      const percentage = initiatives.length > 0 
        ? Math.round((count / initiatives.length) * 100) 
        : 0;

      return {
        range: range.label,
        count,
        percentage
      };
    });

    // Calculate average progress
    const averageProgress = initiatives.length > 0
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
      : 0;

    return NextResponse.json({
      data: initiativesData,
      distribution,
      total_initiatives: initiatives.length,
      average_progress: averageProgress,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Progress distribution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}