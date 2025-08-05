export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';

// Map database initiatives to objectives format using correct schema values
const mapInitiativeToObjective = (initiative: any, areaName: string) => {
  // Generate obstacles and enablers based on progress and status
  let obstacles = 'No obstacles identified';
  let enablers = 'Committed team';
  let status: '🟢' | '🟡' | '🔴' = '🟢';

  // Use correct schema status values
  if (initiative.status === 'on_hold' || initiative.progress < 40) {
    status = '🔴';
    obstacles = initiative.progress < 25 ? 'Limited resources' : 
                initiative.progress < 40 ? 'Complex processes' : 'External dependencies';
  } else if (initiative.status === 'in_progress' && initiative.progress < 75) {
    status = '🟡';
    obstacles = 'Team coordination';
    enablers = 'Management support';
  } else if (initiative.status === 'planning') {
    status = '🟡';
    obstacles = 'Planning phase';
    enablers = 'Clear objectives';
  } else {
    status = '🟢';
    enablers = initiative.progress > 90 ? 'Excellent execution' : 'Adequate resources';
  }

  return {
    objective: initiative.title,
    progress: initiative.progress || 0,
    obstacles: initiative.metadata?.obstacles || obstacles,
    enablers: initiative.metadata?.enablers || enablers,
    status,
    area: areaName
  };
};

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile (secure pattern)
    const { user, userProfile } = await getUserProfile();
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create Supabase client
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const areaName = searchParams.get('area');

    let query = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        status,
        metadata,
        areas!initiatives_area_id_fkey (
          name
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    // Filter by area if specified
    if (areaName) {
      // First get the area ID
      const { data: areas, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('name', areaName)
        .single();

      if (areaError || !areas) {
        return NextResponse.json(
          { error: `Area '${areaName}' not found`, details: areaError?.message },
          { status: 404 }
        );
      }

      query = query.eq('area_id', areas.id);
    }

    const { data: initiatives, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch objectives', details: error.message },
        { status: 500 }
      );
    }

    // Convert initiatives to objectives format
    const objectives = initiatives.map(initiative => 
      mapInitiativeToObjective(initiative, (initiative as any).areas?.name || 'Unknown')
    );

    // Calculate area statistics
    const areaStats = {
      total_objectives: objectives.length,
      average_progress: objectives.length > 0 
        ? Math.round(objectives.reduce((sum, obj) => sum + obj.progress, 0) / objectives.length)
        : 0,
      objectives_at_risk: objectives.filter(obj => obj.status === '🔴').length,
      objectives_on_track: objectives.filter(obj => obj.status === '🟢').length
    };

    // If specific area requested, group by area
    if (!areaName) {
      const groupedObjectives: { [key: string]: any[] } = {};
      objectives.forEach(objective => {
        if (!groupedObjectives[objective.area]) {
          groupedObjectives[objective.area] = [];
        }
        groupedObjectives[objective.area].push(objective);
      });

      return NextResponse.json({
        data: groupedObjectives,
        statistics: areaStats,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      data: objectives,
      area: areaName,
      statistics: areaStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Objectives API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}