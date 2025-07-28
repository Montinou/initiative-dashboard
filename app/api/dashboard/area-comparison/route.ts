import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateUser } from '@/lib/auth-utils';
import { getThemeFromDomain } from '@/lib/theme-config';

const getStatusLevel = (avgProgress: number) => {
  if (avgProgress >= 85) return 'excellent';
  if (avgProgress >= 65) return 'good';
  if (avgProgress >= 40) return 'warning';
  return 'critical';
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;

    // Get domain-based tenant ID
    const host = request.headers.get('host') || '';
    const domainTheme = await getThemeFromDomain(host);
    const tenantId = domainTheme.tenantId;

    // Fetch initiatives with area information
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select(`
        progress,
        areas (
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
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