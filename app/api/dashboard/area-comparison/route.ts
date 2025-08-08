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

// Calculate overall score based on multiple metrics
const calculateOverallScore = ({
  avgProgress,
  completionRate,
  objectivesCount,
  initiativesCount,
  activitiesCompletionRate
}: {
  avgProgress: number;
  completionRate: number;
  objectivesCount: number;
  initiativesCount: number;
  activitiesCompletionRate: number;
}) => {
  // Weighted scoring:
  // - Progress: 30%
  // - Completion Rate: 25%
  // - Activities Completion: 20%
  // - Having objectives: 15%
  // - Having initiatives: 10%
  
  const progressScore = avgProgress * 0.3;
  const completionScore = completionRate * 0.25;
  const activitiesScore = activitiesCompletionRate * 0.2;
  const objectivesScore = Math.min(objectivesCount * 10, 100) * 0.15; // Cap at 100%
  const initiativesScore = Math.min(initiativesCount * 20, 100) * 0.1; // Cap at 100%
  
  return Math.round(
    progressScore + 
    completionScore + 
    activitiesScore + 
    objectivesScore + 
    initiativesScore
  );
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
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Fetch comprehensive data for area comparison
    // Get initiatives with related data
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select(`
        id,
        progress,
        status,
        area_id,
        areas!initiatives_area_id_fkey (
          id,
          name
        ),
        activities (
          id,
          is_completed
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    if (initiativesError) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: initiativesError.message },
        { status: 500 }
      );
    }

    // Get objectives with their linked initiatives for progress calculation
    const { data: objectives, error: objectivesError } = await supabase
      .from('objectives')
      .select(`
        id,
        title,
        area_id,
        areas!objectives_area_id_fkey (
          id,
          name
        ),
        objective_initiatives (
          initiative_id,
          initiatives (
            progress,
            status
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    // Handle objectives error gracefully
    let objectivesData: any[] = [];
    if (objectivesError) {
      console.error('Objectives fetch error:', objectivesError);
      // Continue without objectives if they don't exist
    } else {
      objectivesData = objectives || [];
    }

    // Get all areas for complete comparison
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('tenant_id', userProfile.tenant_id);

    if (areasError) {
      return NextResponse.json(
        { error: 'Failed to fetch areas', details: areasError.message },
        { status: 500 }
      );
    }

    // Handle empty state
    if ((!initiatives || initiatives.length === 0) && (!objectivesData || objectivesData.length === 0)) {
      return NextResponse.json({
        data: [],
        statistics: {
          total_initiatives: 0,
          total_objectives: 0,
          total_areas: areas?.length || 0,
          overall_average: 0,
          best_performing_area: null,
          lowest_performing_area: null
        },
        timestamp: new Date().toISOString()
      });
    }

    // Process data by area
    const areaMetrics = new Map<string, {
      areaId: string;
      areaName: string;
      initiatives: any[];
      objectives: any[];
      activities: { total: number; completed: number };
    }>();

    // Initialize with all areas
    areas?.forEach(area => {
      areaMetrics.set(area.id, {
        areaId: area.id,
        areaName: area.name,
        initiatives: [],
        objectives: [],
        activities: { total: 0, completed: 0 }
      });
    });

    // Group initiatives by area
    initiatives?.forEach(initiative => {
      const areaId = initiative.area_id;
      if (areaId && areaMetrics.has(areaId)) {
        const metrics = areaMetrics.get(areaId)!;
        metrics.initiatives.push(initiative);
        
        // Count activities
        if (initiative.activities) {
          metrics.activities.total += initiative.activities.length;
          metrics.activities.completed += initiative.activities.filter((a: any) => a.is_completed).length;
        }
      }
    });

    // Group objectives by area and calculate their progress
    objectivesData?.forEach(objective => {
      const areaId = objective.area_id;
      if (areaId && areaMetrics.has(areaId)) {
        // Calculate objective progress from linked initiatives
        let objectiveProgress = 0;
        if (objective.objective_initiatives && objective.objective_initiatives.length > 0) {
          const linkedInitiatives = objective.objective_initiatives
            .map((oi: any) => oi.initiatives)
            .filter((i: any) => i);
          
          if (linkedInitiatives.length > 0) {
            const totalProgress = linkedInitiatives.reduce((sum: number, i: any) => sum + (i.progress || 0), 0);
            objectiveProgress = Math.round(totalProgress / linkedInitiatives.length);
          }
        }
        
        areaMetrics.get(areaId)!.objectives.push({
          ...objective,
          progress: objectiveProgress
        });
      }
    });

    // Calculate metrics for each area
    const comparison = Array.from(areaMetrics.values()).map(area => {
      const initiativesCount = area.initiatives.length;
      const objectivesCount = area.objectives.length;
      const completedInitiatives = area.initiatives.filter(i => i.status === 'completed').length;
      const completedObjectives = area.objectives.filter(o => o.progress >= 100).length;
      
      // Calculate average progress
      const initiativeProgress = area.initiatives.map(i => i.progress || 0);
      const objectiveProgress = area.objectives.map(o => o.progress || 0);
      const allProgress = [...initiativeProgress, ...objectiveProgress];
      const averageProgress = allProgress.length > 0
        ? Math.round(allProgress.reduce((sum, p) => sum + p, 0) / allProgress.length)
        : 0;
      
      // Calculate completion rates
      const initiativeCompletionRate = initiativesCount > 0 
        ? (completedInitiatives / initiativesCount) * 100
        : 0;
      
      const objectiveCompletionRate = objectivesCount > 0
        ? (completedObjectives / objectivesCount) * 100
        : 0;
      
      const activitiesCompletionRate = area.activities.total > 0
        ? (area.activities.completed / area.activities.total) * 100
        : 0;
      
      // Calculate overall score
      const overallScore = calculateOverallScore({
        avgProgress: averageProgress,
        completionRate: (initiativeCompletionRate + objectiveCompletionRate) / 2,
        objectivesCount,
        initiativesCount,
        activitiesCompletionRate
      });

      return {
        area: area.areaName,
        objectives: objectivesCount,
        completedObjectives,
        averageProgress,
        initiatives: initiativesCount,
        completedInitiatives,
        overallScore,
        activitiesTotal: area.activities.total,
        activitiesCompleted: area.activities.completed,
        status: getStatusLevel(overallScore)
      };
    }).sort((a, b) => b.overallScore - a.overallScore); // Sort by overall score descending

    // Calculate overall statistics
    const totalInitiatives = initiatives?.length || 0;
    const totalObjectives = objectivesData?.length || 0;
    const overallAverage = comparison.length > 0
      ? Math.round(comparison.reduce((sum, area) => sum + area.overallScore, 0) / comparison.length)
      : 0;

    return NextResponse.json({
      data: comparison,
      statistics: {
        total_initiatives: totalInitiatives,
        total_objectives: totalObjectives,
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