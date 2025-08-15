/**
 * KPI Analytics API Endpoint
 * 
 * Provides KPI analytics data for CEO dashboard with area progress,
 * initiative metrics, time-based filtering, and AI-powered insights.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { generateKPIInsights, type KPIDataForInsights, type GeneratedInsights } from '@/lib/gemini-service';
import { getRedisValue, setRedisValue, isRedisAvailable } from '@/lib/redis-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    if (authError || !user || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const timeRange = searchParams.get('time_range') || 'month'; // Default to last month
    const areaId = searchParams.get('area_id');
    const includeAIInsights = searchParams.get('include_ai_insights') !== 'false'; // Default to true
    
    // Build date filter
    let dateFilter = {};
    const now = new Date();
    
    if (timeRange !== 'all') {
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      }
      
      dateFilter = {
        start: startDate.toISOString(),
        end: now.toISOString()
      };
    }

    // Fetch initiatives with area information
    let initiativesQuery = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        description,
        progress,
        status,
        start_date,
        due_date,
        completion_date,
        created_at,
        updated_at,
        area:areas!initiatives_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    // Apply area filter if specified
    if (areaId) {
      initiativesQuery = initiativesQuery.eq('area_id', areaId);
    }

    // Apply date filter if specified
    if (dateFilter.start) {
      initiativesQuery = initiativesQuery
        .gte('created_at', dateFilter.start)
        .lte('created_at', dateFilter.end);
    }

    const { data: initiatives, error: initiativesError } = await initiativesQuery;

    if (initiativesError) {
      console.error('Error fetching initiatives:', initiativesError);
      throw initiativesError;
    }

    // Calculate overall KPIs
    const totalInitiatives = initiatives?.length || 0;
    const completedInitiatives = initiatives?.filter(i => i.status === 'completed').length || 0;
    const inProgressInitiatives = initiatives?.filter(i => i.status === 'in_progress').length || 0;
    const planningInitiatives = initiatives?.filter(i => i.status === 'planning').length || 0;
    const onHoldInitiatives = initiatives?.filter(i => i.status === 'on_hold').length || 0;
    
    const averageProgress = totalInitiatives > 0
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / totalInitiatives)
      : 0;

    // Calculate overdue initiatives
    const currentDate = new Date();
    const overdueInitiatives = initiatives?.filter(i => 
      i.due_date && 
      new Date(i.due_date) < currentDate && 
      i.status !== 'completed'
    ).length || 0;

    // Group by area for area metrics
    const areaMetrics = {};
    initiatives?.forEach(initiative => {
      const areaName = initiative.area?.name || 'Sin área';
      const areaId = initiative.area?.id || 'no-area';
      
      if (!areaMetrics[areaId]) {
        areaMetrics[areaId] = {
          areaId,
          areaName,
          totalInitiatives: 0,
          completedInitiatives: 0,
          inProgressInitiatives: 0,
          totalProgress: 0,
          overdueInitiatives: 0
        };
      }
      
      areaMetrics[areaId].totalInitiatives++;
      areaMetrics[areaId].totalProgress += initiative.progress || 0;
      
      if (initiative.status === 'completed') {
        areaMetrics[areaId].completedInitiatives++;
      } else if (initiative.status === 'in_progress') {
        areaMetrics[areaId].inProgressInitiatives++;
      }
      
      if (initiative.due_date && new Date(initiative.due_date) < currentDate && initiative.status !== 'completed') {
        areaMetrics[areaId].overdueInitiatives++;
      }
    });

    // Convert area metrics to array and calculate averages
    const areaMetricsArray = Object.values(areaMetrics).map((area: any) => ({
      ...area,
      averageProgress: area.totalInitiatives > 0 
        ? Math.round(area.totalProgress / area.totalInitiatives)
        : 0,
      completionRate: area.totalInitiatives > 0
        ? Math.round((area.completedInitiatives / area.totalInitiatives) * 100)
        : 0
    }));

    // Calculate status distribution
    const statusDistribution = {
      planning: planningInitiatives,
      in_progress: inProgressInitiatives,
      completed: completedInitiatives,
      on_hold: onHoldInitiatives
    };

    // Generate AI insights if requested
    let aiInsights: GeneratedInsights | null = null;
    let insights = [];
    
    if (includeAIInsights && totalInitiatives > 0) {
      // Check cache first
      const cacheKey = `kpi:insights:${userProfile.tenant_id}:${timeRange}:${areaId || 'all'}`;
      
      try {
        const redisAvailable = await isRedisAvailable();
        if (redisAvailable) {
          const cachedInsights = await getRedisValue(cacheKey);
          if (cachedInsights) {
            console.log('[KPI Analytics] AI insights cache hit from Redis');
            aiInsights = cachedInsights as GeneratedInsights;
          }
        }
      } catch (error) {
        console.warn('[KPI Analytics] Redis cache check failed:', error);
      }
      
      // Generate new insights if not cached
      if (!aiInsights) {
        const kpiDataForInsights: KPIDataForInsights = {
          summary: {
            totalInitiatives,
            completedInitiatives,
            inProgressInitiatives,
            planningInitiatives,
            onHoldInitiatives,
            averageProgress,
            overdueInitiatives,
            completionRate: totalInitiatives > 0 
              ? Math.round((completedInitiatives / totalInitiatives) * 100)
              : 0
          },
          areaMetrics: areaMetricsArray,
          statusDistribution,
          recentActivity: initiatives
            ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 5)
            .map(i => ({
              id: i.id,
              title: i.title,
              area: i.area?.name || 'Sin área',
              progress: i.progress,
              status: i.status,
              updatedAt: i.updated_at
            })),
          timeRange,
          userRole: userProfile.role,
          areaFilter: areaId
        };
        
        aiInsights = await generateKPIInsights(kpiDataForInsights);
        
        // Cache the AI insights for 10 minutes
        try {
          const redisAvailable = await isRedisAvailable();
          if (redisAvailable) {
            await setRedisValue(cacheKey, aiInsights, 600); // 10 minutes TTL
            console.log('[KPI Analytics] AI insights cached in Redis for 10 minutes');
          }
        } catch (error) {
          console.warn('[KPI Analytics] Failed to cache AI insights:', error);
        }
      }
      
      // Use AI-generated key insights
      insights = aiInsights.keyInsights || [];
    } else {
      // Fallback to basic insights when AI is disabled or no data
      if (completedInitiatives > 0) {
        const completionRate = Math.round((completedInitiatives / totalInitiatives) * 100);
        insights.push(`${completionRate}% de las iniciativas han sido completadas`);
      }
      
      if (overdueInitiatives > 0) {
        insights.push(`${overdueInitiatives} iniciativa(s) están vencidas y requieren atención`);
      }
      
      if (averageProgress > 70) {
        insights.push(`Excelente progreso general con un promedio de ${averageProgress}%`);
      } else if (averageProgress < 30) {
        insights.push(`El progreso general es bajo (${averageProgress}%), se requiere mayor enfoque`);
      }

      // Find best performing area
      const bestArea = areaMetricsArray.reduce((best, area) => 
        area.averageProgress > (best?.averageProgress || 0) ? area : best
      , null);
      
      if (bestArea && bestArea.averageProgress > 0) {
        insights.push(`${bestArea.areaName} lidera con ${bestArea.averageProgress}% de progreso promedio`);
      }
    }

    // Prepare response
    const response = {
      success: true,
      summary: {
        totalInitiatives,
        completedInitiatives,
        inProgressInitiatives,
        planningInitiatives,
        onHoldInitiatives,
        averageProgress,
        overdueInitiatives,
        completionRate: totalInitiatives > 0 
          ? Math.round((completedInitiatives / totalInitiatives) * 100)
          : 0
      },
      statusDistribution,
      areaMetrics: areaMetricsArray,
      insights,
      aiInsights: aiInsights || undefined, // Include full AI insights if available
      recentActivity: initiatives
        ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          title: i.title,
          area: i.area?.name || 'Sin área',
          progress: i.progress,
          status: i.status,
          updatedAt: i.updated_at
        })),
      metadata: {
        userRole: userProfile.role,
        timeRange,
        areaFilter: areaId || null,
        lastUpdated: new Date().toISOString(),
        aiInsightsEnabled: includeAIInsights
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error in KPI analytics endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}