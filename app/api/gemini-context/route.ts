import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { getRedisValue, setRedisValue, isRedisAvailable } from '@/lib/redis-client';

interface ContextRequest {
  months?: number;
  includeActivities?: boolean;
  useCache?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { user, userProfile: profile, error: authError } = await authenticateRequest(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    // Check if profile exists
    if (!profile || !profile.tenant_id) {
      console.error('[Gemini Context] Profile not found or missing tenant_id:', {
        profileExists: !!profile,
        tenantId: profile?.tenant_id,
        userId: user?.id
      });
      return NextResponse.json(
        { error: 'User profile not found or not properly configured' },
        { status: 403 }
      );
    }

    const body = await request.json() as ContextRequest;
    const months = body.months || 1; // Changed from 3 to 1 month for more relevant recent data
    const includeActivities = body.includeActivities !== false;
    const useCache = body.useCache !== false; // Default to using cache

    // Generate cache key based on user and parameters
    const cacheKey = `gemini:context:${profile.tenant_id}:${profile.id}:${months}:${includeActivities}`;
    
    // Try to get from Redis cache if enabled
    if (useCache) {
      try {
        const redisAvailable = await isRedisAvailable();
        if (redisAvailable) {
          const cachedData = await getRedisValue(cacheKey);
          if (cachedData) {
            console.log('[Gemini Context] Cache hit from Redis');
            return NextResponse.json(cachedData);
          }
        }
      } catch (error) {
        console.warn('[Gemini Context] Redis cache check failed, continuing without cache:', error);
      }
    }

    const supabase = await createClient();
    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Fetch areas - RLS automatically filters by tenant_id
    const { data: areas } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        description,
        manager_id,
        is_active,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('is_active', true);

    // Fetch objectives with linked initiatives - RLS automatically filters by tenant_id
    const { data: objectives } = await supabase
      .from('objectives')
      .select(`
        id,
        title,
        description,
        area_id,
        status,
        priority,
        progress,
        target_date,
        start_date,
        end_date,
        metrics,
        created_at,
        areas!objectives_area_id_fkey(
          id,
          name
        ),
        objective_initiatives(
          initiative_id
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Fetch initiatives with progress - RLS automatically filters by tenant_id
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select(`
        id,
        area_id,
        title,
        description,
        status,
        progress,
        start_date,
        due_date,
        completion_date,
        created_by,
        created_at,
        areas!initiatives_area_id_fkey(
          id,
          name
        ),
        creator:user_profiles!initiatives_created_by_fkey(
          id,
          full_name
        ),
        objective_initiatives(
          objective_id
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Fetch activities if requested
    let activities = [];
    if (includeActivities && initiatives?.length) {
      const initiativeIds = initiatives.map(i => i.id);
      const { data: activitiesData } = await supabase
        .from('activities')
        .select(`
          id,
          initiative_id,
          title,
          description,
          is_completed,
          assigned_to,
          assignee:user_profiles!activities_assigned_to_fkey(
            id,
            full_name,
            email
          )
        `)
        .in('initiative_id', initiativeIds);
      
      activities = activitiesData || [];
    }


    // Calculate summary statistics
    const totalObjectives = objectives?.length || 0;
    const totalInitiatives = initiatives?.length || 0;
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.is_completed).length;
    
    // Calculate average progress
    const avgObjectiveProgress = objectives?.length 
      ? Math.round(objectives.reduce((sum, obj) => sum + (obj.progress || 0), 0) / objectives.length)
      : 0;

    // Calculate area performance
    const areasPerformance: Record<string, any> = {};
    areas?.forEach(area => {
      const areaObjectives = objectives?.filter(o => o.area_id === area.id) || [];
      const areaInitiatives = initiatives?.filter(i => i.area_id === area.id) || [];
      const avgProgress = areaInitiatives.length
        ? Math.round(areaInitiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / areaInitiatives.length)
        : 0;

      areasPerformance[area.id] = {
        objectives: areaObjectives.length,
        initiatives: areaInitiatives.length,
        avg_progress: avgProgress
      };
    });

    // Transform data to match the expected structure
    const contextData = {
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        area_id: profile.area_id,
        tenant_id: profile.tenant_id,
        is_system_admin: profile.is_system_admin || false
      },
      tenant: {
        id: profile.tenant_id,
        organization_name: profile.tenant?.organization?.name || 'Unknown Organization',
        subdomain: profile.tenant?.subdomain || 'unknown'
      },
      context: {
        areas: areas?.map(area => ({
          id: area.id,
          name: area.name,
          description: area.description,
          manager_id: area.manager_id,
          manager_name: area.manager?.full_name || null,
          is_active: area.is_active
        })) || [],
        objectives: objectives?.map(obj => ({
          id: obj.id,
          title: obj.title,
          description: obj.description,
          area_id: obj.area_id,
          area_name: obj.areas?.name || null,
          status: obj.status || 'planning',
          priority: obj.priority || 'medium',
          progress: obj.progress || 0,
          target_date: obj.target_date,
          start_date: obj.start_date,
          end_date: obj.end_date,
          metrics: obj.metrics || [],
          linked_initiative_ids: obj.objective_initiatives?.map(oi => oi.initiative_id) || []
        })) || [],
        initiatives: initiatives?.map(init => ({
          id: init.id,
          area_id: init.area_id,
          area_name: init.areas?.name || null,
          title: init.title,
          description: init.description,
          status: init.status || 'in_progress',
          progress: init.progress || 0,
          start_date: init.start_date,
          due_date: init.due_date,
          completion_date: init.completion_date,
          created_by: init.created_by,
          created_by_name: init.creator?.full_name || null,
          linked_objective_ids: init.objective_initiatives?.map(oi => oi.objective_id) || []
        })) || [],
        activities: activities.map(act => ({
          id: act.id,
          initiative_id: act.initiative_id,
          title: act.title,
          description: act.description,
          is_completed: act.is_completed,
          assigned_to: act.assigned_to,
          assignee_name: act.assignee?.full_name || null,
          assignee_email: act.assignee?.email || null
        }))
      },
      summary: {
        total_objectives: totalObjectives,
        total_initiatives: totalInitiatives,
        total_activities: totalActivities,
        activities_completed: completedActivities,
        avg_objective_progress: avgObjectiveProgress,
        areas_performance: areasPerformance
      },
      metadata: {
        timestamp: now.toISOString(),
        user_role: profile.role,
        data_scope: profile.role === 'CEO' || profile.role === 'Admin' ? 'all_tenant_data' : 'area_restricted',
        language: 'es',
        months_included: months
      }
    };

    // Cache the result in Redis with 5 minute TTL
    if (useCache) {
      try {
        const redisAvailable = await isRedisAvailable();
        if (redisAvailable) {
          const cached = await setRedisValue(cacheKey, contextData, 300); // 5 minutes TTL
          if (cached) {
            console.log('[Gemini Context] Cached in Redis for 5 minutes');
          }
        }
      } catch (error) {
        console.warn('[Gemini Context] Failed to cache in Redis, continuing without cache:', error);
      }
    }

    return NextResponse.json(contextData);
  } catch (error: any) {
    console.error('Error generating Gemini context:', error);
    return NextResponse.json(
      { error: 'Failed to generate context data' },
      { status: 500 }
    );
  }
}