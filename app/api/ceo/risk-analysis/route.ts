import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RiskItem {
  id: string;
  type: 'initiative' | 'objective' | 'area';
  name: string;
  risk_level: 'high' | 'medium' | 'low';
  risk_factors: string[];
  impact: string;
  mitigation: string;
  area_name?: string;
  progress?: number;
  due_date?: string;
  days_until_due?: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user - use getUser for server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user is CEO or Admin
    if (profile.role !== 'CEO' && profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id') || profile.tenant_id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const now = new Date();

    // Get initiatives with their details
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        status,
        due_date,
        start_date,
        area_id,
        areas!initiatives_area_id_fkey(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .neq('status', 'completed');

    if (initiativesError) throw initiativesError;

    // Get objectives with their progress
    const { data: objectives, error: objectivesError } = await supabase
      .from('objectives')
      .select(`
        id,
        title,
        progress,
        status,
        target_date,
        priority,
        area_id,
        areas!objectives_area_id_fkey(
          id,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .neq('status', 'completed');

    if (objectivesError) throw objectivesError;

    // Get activities completion status
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        initiative_id,
        is_completed
      `);

    if (activitiesError) throw activitiesError;

    // Analyze risks for initiatives
    const initiativeRisks: RiskItem[] = initiatives?.map(initiative => {
      const daysUntilDue = initiative.due_date 
        ? Math.floor((new Date(initiative.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const riskFactors: string[] = [];
      let riskLevel: 'high' | 'medium' | 'low' = 'low';

      // Check for overdue
      if (daysUntilDue !== null && daysUntilDue < 0) {
        riskFactors.push('Overdue');
        riskLevel = 'high';
      }
      // Check for approaching deadline with low progress
      else if (daysUntilDue !== null && daysUntilDue <= 7 && (initiative.progress || 0) < 80) {
        riskFactors.push('Approaching deadline');
        riskLevel = 'high';
      }
      else if (daysUntilDue !== null && daysUntilDue <= 30 && (initiative.progress || 0) < 50) {
        riskFactors.push('Behind schedule');
        riskLevel = 'medium';
      }

      // Check for stalled progress
      if (initiative.status === 'on_hold') {
        riskFactors.push('On hold');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // Check for low progress
      if ((initiative.progress || 0) < 30 && initiative.start_date) {
        const daysSinceStart = Math.floor((now.getTime() - new Date(initiative.start_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceStart > 30) {
          riskFactors.push('Low progress');
          riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }
      }

      if (riskFactors.length === 0) return null;

      return {
        id: initiative.id,
        type: 'initiative' as const,
        name: initiative.title,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        impact: `Delays in ${initiative.areas?.name || 'Unknown'} area objectives`,
        mitigation: getMitigationStrategy(riskLevel, riskFactors),
        area_name: initiative.areas?.name,
        progress: initiative.progress,
        due_date: initiative.due_date,
        days_until_due: daysUntilDue
      };
    }).filter(Boolean) as RiskItem[] || [];

    // Analyze risks for objectives
    const objectiveRisks: RiskItem[] = objectives?.map(objective => {
      const daysUntilTarget = objective.target_date 
        ? Math.floor((new Date(objective.target_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const riskFactors: string[] = [];
      let riskLevel: 'high' | 'medium' | 'low' = 'low';

      // Check progress vs priority
      if (objective.priority === 'high' && (objective.progress || 0) < 50) {
        riskFactors.push('High priority with low progress');
        riskLevel = 'high';
      }

      // Check for overdue high priority
      if (daysUntilTarget !== null && daysUntilTarget < 0 && objective.priority === 'high') {
        riskFactors.push('Overdue high priority objective');
        riskLevel = 'high';
      }

      // Check status
      if (objective.status === 'overdue') {
        riskFactors.push('Marked as overdue');
        riskLevel = 'high';
      }

      if (riskFactors.length === 0) return null;

      return {
        id: objective.id,
        type: 'objective' as const,
        name: objective.title,
        risk_level: riskLevel,
        risk_factors: riskFactors,
        impact: 'Strategic goals at risk',
        mitigation: getMitigationStrategy(riskLevel, riskFactors),
        area_name: objective.areas?.name,
        progress: objective.progress
      };
    }).filter(Boolean) as RiskItem[] || [];

    // Combine and sort risks
    const allRisks = [...initiativeRisks, ...objectiveRisks]
      .sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1 };
        return riskOrder[b.risk_level] - riskOrder[a.risk_level];
      });

    // Calculate risk summary
    const riskSummary = {
      total_risks: allRisks.length,
      high_risks: allRisks.filter(r => r.risk_level === 'high').length,
      medium_risks: allRisks.filter(r => r.risk_level === 'medium').length,
      low_risks: allRisks.filter(r => r.risk_level === 'low').length,
      at_risk_initiatives: initiativeRisks.length,
      at_risk_objectives: objectiveRisks.length,
      risk_score: calculateOverallRiskScore(allRisks),
      top_risk_areas: getTopRiskAreas(allRisks)
    };

    return NextResponse.json({
      risks: allRisks.slice(0, 10), // Return top 10 risks
      summary: riskSummary,
      recommendations: getRecommendations(riskSummary),
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching risk analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk analysis data' },
      { status: 500 }
    );
  }
}

function getMitigationStrategy(riskLevel: string, riskFactors: string[]): string {
  if (riskFactors.includes('Overdue')) {
    return 'Immediate action required - escalate to area manager';
  }
  if (riskFactors.includes('Approaching deadline')) {
    return 'Increase resource allocation and daily monitoring';
  }
  if (riskFactors.includes('Behind schedule')) {
    return 'Review scope and adjust timeline or resources';
  }
  if (riskFactors.includes('Low progress')) {
    return 'Identify blockers and provide additional support';
  }
  if (riskFactors.includes('On hold')) {
    return 'Review priority and restart or formally close';
  }
  return 'Monitor closely and review in next meeting';
}

function calculateOverallRiskScore(risks: RiskItem[]): number {
  if (risks.length === 0) return 0;
  
  const riskWeights = { high: 10, medium: 5, low: 2 };
  const totalScore = risks.reduce((sum, risk) => sum + riskWeights[risk.risk_level], 0);
  const maxScore = risks.length * 10;
  
  return Math.round((totalScore / maxScore) * 100);
}

function getTopRiskAreas(risks: RiskItem[]): Array<{ area: string; count: number }> {
  const areaRisks = risks.reduce((acc, risk) => {
    const area = risk.area_name || 'Unknown';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(areaRisks)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function getRecommendations(summary: any): string[] {
  const recommendations: string[] = [];
  
  if (summary.high_risks > 5) {
    recommendations.push('Schedule emergency review meeting for high-risk items');
  }
  if (summary.risk_score > 70) {
    recommendations.push('Consider resource reallocation to critical initiatives');
  }
  if (summary.at_risk_objectives > 3) {
    recommendations.push('Review and adjust strategic objectives timeline');
  }
  if (summary.top_risk_areas.length > 0 && summary.top_risk_areas[0].count > 3) {
    recommendations.push(`Focus on ${summary.top_risk_areas[0].area} area - highest concentration of risks`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring - risk levels are manageable');
  }
  
  return recommendations;
}