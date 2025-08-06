export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { cookies } from 'next/headers';

const getStatusLevel = (avgProgress: number) => {
  if (avgProgress >= 85) return 'excellent';
  if (avgProgress >= 65) return 'good';
  if (avgProgress >= 40) return 'warning';
  return 'critical';
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile (secure pattern)
    const userProfile = await getUserProfile(request);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create Supabase client
    const supabase = await createClient();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Fetch initiatives with area information
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select(`
        progress,
        areas!initiatives_area_id_fkey (
          id,
          name
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

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
        statistics: {
          total_initiatives: 0,
          total_areas: 0,
          overall_average: 0,
          best_performing_area: null,
          lowest_performing_area: null
        },
        timestamp: new Date().toISOString()
      });
    }

    // Group initiatives by area and calculate averages
    const areaGroups: { [key: string]: { progress: number[], name: string } } = {};

    initiatives.forEach(initiative => {
      const areaName = (initiative as any).areas?.name;
      if (areaName) {
        if (!areaGroups[areaName]) {
          areaGroups[areaName] = { progress: [], name: areaName };
        }
        areaGroups[areaName].progress.push(initiative.progress);
      }
    });

    // Calculate area comparison data
    const comparison = Object.values(areaGroups).map(group => {
      const avgProgress = group.progress.length > 0
        ? Math.round(group.progress.reduce((sum, p) => sum + p, 0) / group.progress.length)
        : 0;

      return {
        area: group.name,
        avgProgress,
        initiativesCount: group.progress.length,
        status: getStatusLevel(avgProgress)
      };
    }).sort((a, b) => b.avgProgress - a.avgProgress); // Sort by progress descending

    // Calculate overall statistics
    const totalInitiatives = initiatives.length;
    const overallAverage = totalInitiatives > 0
      ? Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives)
      : 0;

    return NextResponse.json({
      data: comparison,
      statistics: {
        total_initiatives: totalInitiatives,
        total_areas: comparison.length,
        overall_average: overallAverage,
        best_performing_area: comparison[0]?.area || null,
        lowest_performing_area: comparison[comparison.length - 1]?.area || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Area comparison API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}