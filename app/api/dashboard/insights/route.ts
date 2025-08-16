import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { getVertexAICredentials } from '@/lib/gcp-secret-manager'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role, area_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const forceRegenerate = request.nextUrl.searchParams.get('regenerate') === 'true'
    const redisKey = cacheKeys.aiInsights(profile.tenant_id, 'dashboard')

    // Step 1: Check Redis cache first (5-minute cache)
    if (!forceRegenerate) {
      const redisCache = await cache.get<any>(redisKey)
      
      if (redisCache) {
        console.log('Returning Dashboard AI insights from Redis cache')
        return NextResponse.json({ 
          insights: redisCache,
          cached: true,
          cacheType: 'redis',
          generated_at: new Date().toISOString()
        })
      }
    }

    // Step 2: If not in Redis, check database cache (24-hour cache)
    if (!forceRegenerate) {
      const { data: dbCachedInsights, error: dbCacheError } = await supabase
        .rpc('get_latest_insights', {
          p_tenant_id: profile.tenant_id,
          p_context: 'dashboard',
          p_insight_type: 'daily'
        })

      if (dbCachedInsights) {
        console.log('Returning Dashboard AI insights from database cache, saving to Redis')
        
        // Save to Redis for 5 minutes
        await cache.set(redisKey, dbCachedInsights, CACHE_TTL.AI_INSIGHTS)
        
        return NextResponse.json({ 
          insights: dbCachedInsights,
          cached: true,
          cacheType: 'database',
          generated_at: new Date().toISOString()
        })
      }
    }

    // Step 3: Generate new insights if not cached or force regenerate
    console.log('Generating new Dashboard AI insights')

    // Gather dashboard data - Filter by area if user is Manager
    let initiativesQuery = supabase.from('initiatives').select('*, areas(name)')
    let objectivesQuery = supabase.from('objectives').select('*')
    let areasQuery = supabase.from('areas').select('*, user_profiles!areas_manager_id_fkey(full_name)')
    let activitiesQuery = supabase.from('activities').select('*, initiatives(tenant_id, area_id)')

    // Apply area filtering for Managers
    if (profile.role === 'Manager' && profile.area_id) {
      initiativesQuery = initiativesQuery.eq('area_id', profile.area_id)
      objectivesQuery = objectivesQuery.eq('area_id', profile.area_id)
      areasQuery = areasQuery.eq('id', profile.area_id)
      activitiesQuery = activitiesQuery.eq('initiatives.area_id', profile.area_id)
    }

    const [
      { data: initiatives },
      { data: objectives },
      { data: areas },
      { data: activities }
    ] = await Promise.all([
      initiativesQuery,
      objectivesQuery,
      areasQuery,
      activitiesQuery
    ])

    // Build dashboard data object
    const dashboardData = {
      user_context: {
        role: profile.role,
        area_restricted: profile.role === 'Manager',
        area_id: profile.area_id,
        can_see_all_areas: ['CEO', 'Admin'].includes(profile.role)
      },
      overall_metrics: {
        total_initiatives: initiatives?.length || 0,
        completed_initiatives: initiatives?.filter(i => i.status === 'completed').length || 0,
        in_progress_initiatives: initiatives?.filter(i => i.status === 'in_progress').length || 0,
        on_hold_initiatives: initiatives?.filter(i => i.status === 'on_hold').length || 0,
        planning_initiatives: initiatives?.filter(i => i.status === 'planning').length || 0,
        average_progress: Math.round(initiatives?.reduce((sum, i) => sum + (i.progress || 0), 0) / (initiatives?.length || 1)) || 0,
        total_objectives: objectives?.length || 0,
        completed_objectives: objectives?.filter(o => o.status === 'completed').length || 0,
        total_areas: areas?.length || 0,
        total_activities: activities?.length || 0,
        completed_activities: activities?.filter(a => a.is_completed).length || 0
      },
      performance_by_status: {
        planning: initiatives?.filter(i => i.status === 'planning').map(i => ({ title: i.title, progress: i.progress })) || [],
        in_progress: initiatives?.filter(i => i.status === 'in_progress').map(i => ({ title: i.title, progress: i.progress, due_date: i.due_date })) || [],
        completed: initiatives?.filter(i => i.status === 'completed').map(i => ({ title: i.title, completion_date: i.completion_date })) || [],
        on_hold: initiatives?.filter(i => i.status === 'on_hold').map(i => ({ title: i.title, reason: i.notes })) || []
      },
      area_performance: areas?.map(area => ({
        area_name: area.name,
        manager_name: area.user_profiles?.full_name || 'Sin asignar',
        initiative_count: initiatives?.filter(i => i.area_id === area.id).length || 0,
        completed_count: initiatives?.filter(i => i.area_id === area.id && i.status === 'completed').length || 0,
        avg_progress: Math.round(
          initiatives?.filter(i => i.area_id === area.id)
            .reduce((sum, i) => sum + (i.progress || 0), 0) / 
            (initiatives?.filter(i => i.area_id === area.id).length || 1)
        ) || 0,
        overdue_count: initiatives?.filter(i => {
          if (i.area_id !== area.id || !i.due_date) return false
          const dueDate = new Date(i.due_date)
          return dueDate < new Date() && i.status !== 'completed'
        }).length || 0
      })) || [],
      progress_distribution: {
        high_progress: initiatives?.filter(i => i.progress >= 80).length || 0,
        medium_progress: initiatives?.filter(i => i.progress >= 40 && i.progress < 80).length || 0,
        low_progress: initiatives?.filter(i => i.progress < 40).length || 0
      },
      recent_activities: activities?.filter(a => {
        const createdDate = new Date(a.created_at || Date.now())
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        return createdDate >= threeDaysAgo
      }).map(a => ({
        title: a.title,
        is_completed: a.is_completed,
        created_at: a.created_at
      })) || [],
      generated_at: new Date().toISOString()
    }

    // Generate insights using Vertex AI
    const insightsData = await generateDashboardAIInsights(dashboardData)

    // Store in both Redis (5 minutes) and database (24 hours)
    await Promise.all([
      // Save to Redis for 5 minutes
      cache.set(redisKey, insightsData, CACHE_TTL.AI_INSIGHTS),
      
      // Save to database for 24 hours
      supabase.from('ai_insights').insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        insight_type: 'daily',
        context: 'dashboard',
        source_data: dashboardData,
        insights: insightsData,
        model_used: 'gemini-2.5-flash',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    ])

    return NextResponse.json({
      insights: insightsData,
      cached: false,
      cacheType: 'generated',
      generated_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard Insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateDashboardAIInsights(dashboardData: any): Promise<any> {
  try {
    // Check if we're in production
    const isProduction = process.env.NODE_ENV === 'production'

    // Configure the model based on environment
    let model
    
    if (!isProduction) {
      // Development: Use Node.js version with Application Default Credentials
      const { vertex } = await import('@ai-sdk/google-vertex')
      model = vertex('gemini-2.0-flash-exp', {
        projectId: process.env.GCP_PROJECT_ID || 'insaight-backend',
        location: 'us-central1',
      })
    } else {
      // Production: Retrieve credentials from Secret Manager
      try {
        const credentials = await getVertexAICredentials()
        
        // Set credentials as environment variables for the SDK
        process.env.GOOGLE_CLIENT_EMAIL = credentials.client_email
        process.env.GOOGLE_PRIVATE_KEY = credentials.private_key
        process.env.GOOGLE_PRIVATE_KEY_ID = credentials.private_key_id
        
        const { vertex } = await import('@ai-sdk/google-vertex/edge')
        model = vertex('gemini-2.5-flash', {
          projectId: credentials.project_id || 'insaight-backend',
          location: 'us-central1',
        })
      } catch (error) {
        console.error('Failed to initialize Vertex AI from Secret Manager:', error)
        throw new Error('AI service temporarily unavailable')
      }
    }

    const userRole = dashboardData.user_context?.role || 'User'
    const isAreaRestricted = dashboardData.user_context?.area_restricted || false

    const prompt = `
Eres un coach operacional especializado en optimización de equipos y ejecución de proyectos.
Audiencia: Gerentes de área, coordinadores de proyecto y equipos operacionales.
Rol del usuario: ${userRole}${isAreaRestricted ? ' (Vista restringida a su área)' : ' (Vista completa organizacional)'}

DATOS OPERACIONALES:
${JSON.stringify(dashboardData, null, 2)}

MISIÓN: Generar insights PRÁCTICOS para mejorar la EJECUCIÓN DIARIA y resolver obstáculos operacionales.

ENFOQUE OPERACIONAL:
${userRole === 'Manager' ? `
🎯 FOCO MANAGER:
- Gestión directa del equipo y recursos del área
- Cumplimiento de plazos y calidad de entregas
- Identificación de bloqueos y soluciones inmediatas
- Optimización de procesos de trabajo del área
- Comunicación ascendente de necesidades
` : `
🎯 FOCO COORDINACIÓN:
- Sincronización entre equipos y áreas
- Identificación de dependencias críticas
- Optimización de flujos de trabajo inter-áreas
- Detección de oportunidades de colaboración
- Comunicación horizontal de mejores prácticas
`}

CRITERIOS DASHBOARD OPERACIONAL:
- Insights enfocados en HACER, no en DECIDIR estrategia
- Recomendaciones ejecutables en 1-7 días máximo
- Foco en productividad del equipo y eficiencia operativa
- Métricas de progreso, no de impacto financiero
- Identificación de problemas de ejecución, no de dirección
- Lenguaje directo y orientado a la acción inmediata

FORMATO JSON DASHBOARD:
{
  "summary": "Resumen ejecutivo de 2 líneas sobre estado actual y próxima acción recomendada",
  "keyInsights": [
    "Estado operacional actual con métrica específica del equipo",
    "Patrón de trabajo identificado que afecta productividad",
    "Oportunidad de mejora inmediata en procesos de ejecución"
  ],
  "performanceHighlights": [
    "Logro del equipo completado recientemente con métricas",
    "Mejora operacional notable vs. semana/mes anterior"
  ],
  "areaAnalysis": [
    "${isAreaRestricted ? 'Rendimiento específico de tu equipo y área de responsabilidad' : 'Comparación operacional entre áreas para identificar mejores prácticas'}",
    "${isAreaRestricted ? 'Fortalezas del equipo y oportunidades de mejora operativa' : 'Oportunidades de colaboración y transferencia de conocimiento'}"
  ],
  "trendsAndPatterns": [
    "Patrón de productividad o ejecución identificado en últimos días/semanas",
    "Comportamiento del equipo que requiere ajuste operacional"
  ],
  "risks": [
    "Obstáculo operacional inmediato que puede afectar entregas",
    "Proceso o recurso que requiere atención para evitar retrasos"
  ],
  "opportunities": [
    "Quick win operacional implementable esta semana",
    "Mejora de proceso con beneficio inmediato en productividad"
  ],
  "recommendations": [
    "Acción operacional específica para implementar ESTA SEMANA",
    "Mejora de proceso a implementar en próximos 15 días"
  ],
  "actionPriorities": [
    "URGENTE: Acción crítica para mantener flujo de trabajo",
    "IMPORTANTE: Mejora de proceso para optimizar productividad",
    "OPORTUNIDAD: Iniciativa que puede facilitar el trabajo del equipo"
  ]
}

MÉTRICAS PARA ANÁLISIS:
- Iniciativas totales: ${dashboardData.overall_metrics?.total_initiatives || 0}
- Progreso promedio: ${dashboardData.overall_metrics?.average_progress || 0}%
- Completadas: ${dashboardData.overall_metrics?.completed_initiatives || 0}
- En progreso: ${dashboardData.overall_metrics?.in_progress_initiatives || 0}
- Actividades recientes: ${dashboardData.recent_activities?.length || 0}
- Distribución de progreso: ${dashboardData.progress_distribution?.high_progress || 0} alto, ${dashboardData.progress_distribution?.medium_progress || 0} medio, ${dashboardData.progress_distribution?.low_progress || 0} bajo

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, sin texto adicional.`

    // Generate response using Vercel AI SDK with Vertex AI
    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.7,
      maxTokens: 2048,
    })
    
    // Parse the JSON response
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        console.log('Successfully generated Dashboard AI insights')
        return parsed
      }
    } catch (parseError) {
      console.error('Failed to parse Dashboard AI response:', parseError)
      console.error('Raw response:', text)
    }

    // Fallback insights if parsing fails
    return generateDashboardFallbackInsights(dashboardData)

  } catch (error) {
    console.error('Dashboard AI generation error:', error)
    return generateDashboardFallbackInsights(dashboardData)
  }
}

function generateDashboardFallbackInsights(dashboardData: any): any {
  const metrics = dashboardData.overall_metrics
  const userRole = dashboardData.user_context?.role || 'User'
  const isAreaRestricted = dashboardData.user_context?.area_restricted || false
  
  const avgProgress = metrics?.average_progress || 0
  const completionRate = metrics?.total_initiatives > 0 
    ? Math.round((metrics.completed_initiatives / metrics.total_initiatives) * 100) 
    : 0
  
  const inProgressCount = metrics?.in_progress_initiatives || 0
  const recentActivityCount = dashboardData.recent_activities?.length || 0

  return {
    summary: `${userRole}: ${metrics?.total_initiatives || 0} iniciativas activas (${completionRate}% completadas). ${inProgressCount > 0 ? `Enfocar en ${inProgressCount} iniciativas en progreso.` : 'Mantener ritmo actual.'}`,
    keyInsights: [
      `Progreso promedio actual: ${avgProgress}% ${avgProgress > 60 ? '(por encima del benchmark)' : '(requiere atención)'}`,
      `${inProgressCount} iniciativas en ejecución activa requieren seguimiento`,
      `Actividad reciente: ${recentActivityCount} acciones registradas en últimos 3 días`
    ],
    performanceHighlights: [
      `${metrics?.completed_initiatives || 0} iniciativas finalizadas exitosamente`,
      completionRate > 70 ? `Excelente tasa de éxito: ${completionRate}%` : `Oportunidad de mejora: ${completionRate}% de tasa de éxito`
    ],
    areaAnalysis: isAreaRestricted ? [
      `Tu área: ${metrics?.total_initiatives || 0} iniciativas bajo gestión`,
      `Rendimiento del equipo: ${avgProgress}% de progreso promedio`
    ] : [
      `${dashboardData.area_performance?.length || 0} áreas activas en la organización`,
      `Distribución: ${dashboardData.progress_distribution?.high_progress || 0} iniciativas con alto progreso`
    ],
    trendsAndPatterns: [
      inProgressCount > (metrics?.completed_initiatives || 0) ? 'Tendencia: Más iniciativas en proceso que completadas' : 'Tendencia: Balance saludable entre ejecución y finalización',
      recentActivityCount > 5 ? 'Patrón: Alta actividad en últimos días' : 'Patrón: Actividad estable'
    ],
    risks: inProgressCount > 5 ? [
      `Riesgo: ${inProgressCount} iniciativas simultáneas pueden causar dispersión de recursos`,
      'Supervisar capacidad del equipo para manejar carga actual'
    ] : [
      avgProgress < 50 ? `Riesgo: Progreso promedio bajo (${avgProgress}%) indica posibles obstáculos` : 'Riesgo bajo: Flujo de trabajo estable'
    ],
    opportunities: [
      dashboardData.progress_distribution?.high_progress > 0 ? `Quick win: ${dashboardData.progress_distribution.high_progress} iniciativas cerca de completarse` : 'Oportunidad: Acelerar progreso en iniciativas existentes',
      `Mejora de proceso: Replicar mejores prácticas ${isAreaRestricted ? 'dentro del equipo' : 'entre áreas'}`
    ],
    recommendations: [
      inProgressCount > 0 ? `Esta semana: Revisar estado de ${Math.min(3, inProgressCount)} iniciativas prioritarias` : 'Esta semana: Planificar próximas iniciativas',
      `Próximo mes: ${avgProgress < 60 ? 'Identificar y resolver obstáculos en progreso' : 'Mantener momentum actual y planificar expansión'}`
    ],
    actionPriorities: [
      `#1 ${userRole}: ${inProgressCount > 0 ? 'Asegurar progreso en iniciativas activas' : 'Iniciar nuevas iniciativas planificadas'}`,
      `#2 Seguimiento: Revisar métricas semanalmente con el equipo`,
      `#3 Optimización: ${isAreaRestricted ? 'Documentar mejores prácticas del área' : 'Compartir aprendizajes entre áreas'}`
    ]
  }
}

// POST endpoint to manually regenerate insights
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const redisKey = cacheKeys.aiInsights(profile.tenant_id, 'dashboard')

    // Check if Redis cache exists (to avoid regenerating if recently regenerated)
    const redisCache = await cache.get<any>(redisKey)
    if (redisCache) {
      const ttl = await cache.ttl(redisKey)
      console.log(`Dashboard insights recently regenerated, ${ttl} seconds remaining in cache`)
      
      return NextResponse.json({ 
        insights: redisCache,
        cached: true,
        cacheType: 'redis',
        message: `Insights fueron regenerados recientemente. Espere ${Math.ceil(ttl / 60)} minutos antes de regenerar nuevamente.`,
        ttl_seconds: ttl,
        generated_at: new Date().toISOString()
      })
    }

    // Clear database cache to force regeneration
    await supabase
      .from('ai_insights')
      .delete()
      .eq('tenant_id', profile.tenant_id)
      .eq('context', 'dashboard')
      .eq('insight_type', 'daily')
      .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    // Force regeneration by calling GET with regenerate flag
    const url = new URL(request.url)
    url.searchParams.set('regenerate', 'true')
    
    const newRequest = new NextRequest(url, {
      method: 'GET',
      headers: request.headers
    })
    
    return GET(newRequest)
  } catch (error) {
    console.error('POST Dashboard Insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
