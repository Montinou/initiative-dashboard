import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Map database initiatives to objectives format for backward compatibility
const mapInitiativeToObjective = (initiative: any, areaName: string) => {
  // Generate obstacles and enablers based on progress and status
  let obstacles = 'Sin obstáculos identificados';
  let enablers = 'Equipo comprometido';
  let status: '🟢' | '🟡' | '🔴' = '🟢';

  if (initiative.status === 'Atrasado' || initiative.progress < 40) {
    status = '🔴';
    obstacles = initiative.progress < 25 ? 'Recursos limitados' : 
                initiative.progress < 40 ? 'Procesos complejos' : 'Dependencies externas';
  } else if (initiative.status === 'En Curso' && initiative.progress < 75) {
    status = '🟡';
    obstacles = 'Coordinación entre equipos';
    enablers = 'Apoyo de gerencia';
  } else {
    status = '🟢';
    enablers = initiative.progress > 90 ? 'Excelente ejecución' : 'Recursos adecuados';
  }

  return {
    objective: initiative.title,
    progress: initiative.progress,
    obstacles,
    enablers,
    status,
    area: areaName
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id') || 'fema-electricidad';
    const areaName = searchParams.get('area');

    let query = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        status,
        areas (
          name
        )
      `)
      .eq('tenant_id', tenantId);

    // Filter by area if specified
    if (areaName) {
      // First get the area ID
      const { data: areas, error: areaError } = await supabase
        .from('areas')
        .select('id')
        .eq('tenant_id', tenantId)
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