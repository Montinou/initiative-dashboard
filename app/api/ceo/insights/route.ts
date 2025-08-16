import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateText } from 'ai'
import { getVertexAICredentials } from '@/lib/gcp-secret-manager'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile and verify CEO/Admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!['CEO', 'Admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const forceRegenerate = request.nextUrl.searchParams.get('regenerate') === 'true'
    const redisKey = cacheKeys.aiInsights(profile.tenant_id, 'ceo_dashboard')

    // Step 1: Check Redis cache first (5-minute cache)
    if (!forceRegenerate) {
      const redisCache = await cache.get<any>(redisKey)
      
      if (redisCache) {
        console.log('Returning AI insights from Redis cache')
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
          p_context: 'ceo_dashboard',
          p_insight_type: 'daily'
        })

      if (dbCachedInsights) {
        console.log('Returning AI insights from database cache, saving to Redis')
        
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
    console.log('Generating new AI insights')

    // Gather CEO dashboard data
    const [
      { data: initiatives },
      { data: objectives },
      { data: areas },
      { data: activities }
    ] = await Promise.all([
      supabase.from('initiatives').select('*, areas(name)').eq('tenant_id', profile.tenant_id),
      supabase.from('objectives').select('*').eq('tenant_id', profile.tenant_id),
      supabase.from('areas').select('*, user_profiles!areas_manager_id_fkey(full_name)').eq('tenant_id', profile.tenant_id),
      supabase.from('activities').select('*, initiatives(tenant_id)').eq('initiatives.tenant_id', profile.tenant_id)
    ])

    // Build dashboard data object
    const dashboardData = {
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
      at_risk_initiatives: initiatives?.filter(i => {
        if (!i.due_date || i.status === 'completed') return false
        const dueDate = new Date(i.due_date)
        const today = new Date()
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return (daysUntilDue < 7 && i.progress < 80) || (i.progress < 30 && i.status === 'in_progress')
      }).map(i => ({
        title: i.title,
        progress: i.progress,
        due_date: i.due_date,
        area_name: i.areas?.name || 'Sin área',
        risk_level: i.progress < 30 ? 'high' : 'medium'
      })) || [],
      recent_achievements: initiatives?.filter(i => {
        if (i.status !== 'completed' || !i.completion_date) return false
        const completionDate = new Date(i.completion_date)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return completionDate >= sevenDaysAgo
      }).map(i => ({
        title: i.title,
        area_name: i.areas?.name || 'Sin área',
        completion_date: i.completion_date
      })) || [],
      generated_at: new Date().toISOString()
    }

    // Generate insights using Vertex AI
    const insightsData = await generateAIInsights(dashboardData)

    // Store in both Redis (5 minutes) and database (24 hours)
    await Promise.all([
      // Save to Redis for 5 minutes
      cache.set(redisKey, insightsData, CACHE_TTL.AI_INSIGHTS),
      
      // Save to database for 24 hours
      supabase.from('ai_insights').insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        insight_type: 'daily',
        context: 'ceo_dashboard',
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
    console.error('Insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateAIInsights(dashboardData: any): Promise<any> {
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

    const prompt = `
Eres un asesor estratégico experto analizando el dashboard ejecutivo de una organización.
IMPORTANTE: SIEMPRE responde completamente en español.

Datos del Dashboard:
${JSON.stringify(dashboardData, null, 2)}

Genera insights estratégicos en español siguiendo EXACTAMENTE este formato JSON (no agregues comentarios ni texto adicional fuera del JSON):

{
  "summary": "Resumen ejecutivo conciso de 2-3 líneas sobre el estado general de la organización basado en los datos proporcionados",
  "key_insights": [
    "Insight estratégico específico basado en los datos (máximo 100 caracteres)",
    "Segundo insight relevante sobre el desempeño actual (máximo 100 caracteres)",
    "Tercer insight sobre oportunidades o riesgos detectados (máximo 100 caracteres)"
  ],
  "recommendations": [
    {
      "priority": "high",
      "title": "Acción prioritaria basada en los datos",
      "description": "Descripción específica de qué hacer",
      "impact": "Beneficio esperado de esta acción"
    },
    {
      "priority": "medium",
      "title": "Mejora recomendada",
      "description": "Acción sugerida para optimizar resultados",
      "impact": "Resultado esperado"
    }
  ],
  "risks": [
    {
      "level": "high",
      "title": "Riesgo principal identificado",
      "description": "Descripción del riesgo basado en los datos",
      "mitigation": "Estrategia específica para mitigar este riesgo"
    }
  ],
  "opportunities": [
    {
      "title": "Oportunidad de mejora detectada",
      "description": "Descripción basada en el análisis de datos",
      "potential_value": "Beneficio potencial si se aprovecha"
    }
  ],
  "performance_analysis": {
    "best_performing_area": "Nombre del área con mejor desempeño según los datos",
    "needs_attention_area": "Nombre del área que requiere más atención",
    "overall_trend": "${dashboardData.overall_metrics.average_progress > 70 ? 'improving' : dashboardData.overall_metrics.average_progress > 40 ? 'stable' : 'declining'}",
    "trend_explanation": "Explicación breve basada en métricas actuales"
  },
  "metrics_highlights": {
    "positive": [
      "Métrica positiva específica de los datos",
      "Otro aspecto positivo identificado"
    ],
    "negative": [
      "Área de preocupación basada en los datos",
      "Métrica que necesita mejora"
    ],
    "neutral": [
      "Observación objetiva sobre el estado actual"
    ]
  }
}

Analiza específicamente:
- ${dashboardData.overall_metrics.total_initiatives} iniciativas totales con ${dashboardData.overall_metrics.average_progress}% de progreso promedio
- ${dashboardData.overall_metrics.completed_initiatives} iniciativas completadas de ${dashboardData.overall_metrics.total_initiatives}
- ${dashboardData.at_risk_initiatives?.length || 0} iniciativas en riesgo
- ${dashboardData.overall_metrics.total_areas} áreas con diferentes niveles de desempeño
- Tendencias y patrones en los datos proporcionados

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional antes o después.`

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
        console.log('Successfully generated AI insights')
        return parsed
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', text)
    }

    // Fallback insights if parsing fails but we have data
    return generateFallbackInsights(dashboardData)

  } catch (error) {
    console.error('AI generation error:', error)
    // Return data-based fallback insights
    return generateFallbackInsights(dashboardData)
  }
}

function generateFallbackInsights(dashboardData: any): any {
  const avgProgress = dashboardData.overall_metrics?.average_progress || 0
  const completionRate = dashboardData.overall_metrics?.total_initiatives > 0
    ? Math.round((dashboardData.overall_metrics.completed_initiatives / dashboardData.overall_metrics.total_initiatives) * 100)
    : 0
  
  const bestArea = dashboardData.area_performance?.reduce((best: any, current: any) => 
    (current.avg_progress > (best?.avg_progress || 0)) ? current : best
  , null)
  
  const worstArea = dashboardData.area_performance?.reduce((worst: any, current: any) => 
    (current.avg_progress < (worst?.avg_progress || 100)) ? current : worst
  , null)

  return {
    summary: `La organización tiene ${dashboardData.overall_metrics?.total_initiatives || 0} iniciativas activas con un progreso promedio del ${avgProgress}%. Se han completado ${dashboardData.overall_metrics?.completed_initiatives || 0} iniciativas y hay ${dashboardData.at_risk_initiatives?.length || 0} en riesgo.`,
    key_insights: [
      `${dashboardData.overall_metrics?.total_initiatives || 0} iniciativas en ${dashboardData.overall_metrics?.total_areas || 0} áreas`,
      `Progreso promedio: ${avgProgress}%`,
      `Tasa de completado: ${completionRate}%`
    ],
    recommendations: [
      {
        priority: dashboardData.at_risk_initiatives?.length > 3 ? "high" : "medium",
        title: "Revisar iniciativas en riesgo",
        description: `Hay ${dashboardData.at_risk_initiatives?.length || 0} iniciativas que requieren atención inmediata`,
        impact: "Prevenir retrasos y mejorar tasa de éxito"
      },
      {
        priority: avgProgress < 50 ? "high" : "low",
        title: "Acelerar progreso de iniciativas",
        description: "Identificar y eliminar obstáculos en iniciativas con bajo progreso",
        impact: "Incrementar velocidad de ejecución"
      }
    ],
    risks: dashboardData.at_risk_initiatives?.length > 0 ? [
      {
        level: dashboardData.at_risk_initiatives?.length > 5 ? "critical" : "high",
        title: "Iniciativas en riesgo de incumplimiento",
        description: `${dashboardData.at_risk_initiatives?.length} iniciativas están en riesgo`,
        mitigation: "Asignar recursos adicionales y revisar plazos"
      }
    ] : [],
    opportunities: [
      {
        title: bestArea ? `Replicar éxito de ${bestArea.area_name}` : "Optimizar áreas de alto rendimiento",
        description: bestArea ? `${bestArea.area_name} tiene ${bestArea.avg_progress}% de progreso promedio` : "Identificar mejores prácticas",
        potential_value: "Mejorar rendimiento general de la organización"
      }
    ],
    performance_analysis: {
      best_performing_area: bestArea?.area_name || "Por determinar",
      needs_attention_area: worstArea?.area_name || "Por determinar",
      overall_trend: avgProgress > 70 ? "improving" : avgProgress > 40 ? "stable" : "declining",
      trend_explanation: `Con ${avgProgress}% de progreso promedio y ${completionRate}% de tasa de completado`
    },
    metrics_highlights: {
      positive: [
        `${dashboardData.overall_metrics?.completed_initiatives || 0} iniciativas completadas exitosamente`,
        dashboardData.recent_achievements?.length > 0 ? `${dashboardData.recent_achievements.length} logros recientes` : null
      ].filter(Boolean),
      negative: [
        dashboardData.at_risk_initiatives?.length > 0 ? `${dashboardData.at_risk_initiatives.length} iniciativas en riesgo` : null,
        avgProgress < 50 ? `Progreso promedio bajo (${avgProgress}%)` : null
      ].filter(Boolean),
      neutral: [
        `${dashboardData.overall_metrics?.total_areas || 0} áreas activas en la organización`
      ]
    }
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

    if (!profile || !['CEO', 'Admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const redisKey = cacheKeys.aiInsights(profile.tenant_id, 'ceo_dashboard')

    // Check if Redis cache exists (to avoid regenerating if recently regenerated)
    const redisCache = await cache.get<any>(redisKey)
    if (redisCache) {
      const ttl = await cache.ttl(redisKey)
      console.log(`Insights recently regenerated, ${ttl} seconds remaining in cache`)
      
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
      .eq('context', 'ceo_dashboard')
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
    console.error('POST Insights API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}