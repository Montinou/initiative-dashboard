import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cache, cacheKeys, CACHE_TTL } from '@/lib/redis'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

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

    // Load and execute the CEO insights query
    const queryPath = join(process.cwd(), 'lib', 'queries', 'ceo-insights-query.sql')
    const queryTemplate = readFileSync(queryPath, 'utf-8')
    
    // Execute the comprehensive data query
    const { data: dashboardData, error: queryError } = await supabase
      .rpc('execute_ceo_insights_query', { p_tenant_id: profile.tenant_id })

    if (queryError) {
      // If the function doesn't exist, execute the query directly
      const query = queryTemplate.replace(/\$1/g, `'${profile.tenant_id}'`)
      const { data: directData, error: directError } = await supabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .limit(1)

      if (directError) {
        console.error('Query error:', directError)
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
      }

      // For now, we'll create a simpler query to get the data
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
      const dashboardDataSimple = {
        overall_metrics: {
          total_initiatives: initiatives?.length || 0,
          completed_initiatives: initiatives?.filter(i => i.status === 'completed').length || 0,
          in_progress_initiatives: initiatives?.filter(i => i.status === 'in_progress').length || 0,
          average_progress: initiatives?.reduce((sum, i) => sum + (i.progress || 0), 0) / (initiatives?.length || 1) || 0,
          total_objectives: objectives?.length || 0,
          total_areas: areas?.length || 0,
          total_activities: activities?.length || 0,
          completed_activities: activities?.filter(a => a.is_completed).length || 0
        },
        area_performance: areas?.map(area => ({
          area_name: area.name,
          manager_name: area.user_profiles?.full_name || 'Sin asignar',
          initiative_count: initiatives?.filter(i => i.area_id === area.id).length || 0,
          avg_progress: initiatives?.filter(i => i.area_id === area.id)
            .reduce((sum, i) => sum + (i.progress || 0), 0) / 
            (initiatives?.filter(i => i.area_id === area.id).length || 1) || 0
        })),
        at_risk_initiatives: initiatives?.filter(i => {
          const dueDate = new Date(i.due_date)
          const today = new Date()
          const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          return i.status !== 'completed' && (daysUntilDue < 7 || i.progress < 30)
        }).map(i => ({
          title: i.title,
          progress: i.progress,
          due_date: i.due_date,
          area_name: i.areas?.name || 'Sin área'
        })),
        generated_at: new Date().toISOString()
      }

      // Generate insights using Gemini AI
      const insightsData = await generateAIInsights(dashboardDataSimple)

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
          source_data: dashboardDataSimple,
          insights: insightsData,
          model_used: 'gemini-1.5-pro',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      ])

      return NextResponse.json({
        insights: insightsData,
        cached: false,
        cacheType: 'generated',
        generated_at: new Date().toISOString()
      })
    }

    // Generate insights from the dashboard data
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
        model_used: 'gemini-1.5-pro',
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
    const prompt = `
Eres un asesor estratégico experto analizando el dashboard ejecutivo de una organización.

Datos del Dashboard:
${JSON.stringify(dashboardData, null, 2)}

Genera insights estratégicos en español siguiendo este formato JSON:

{
  "summary": "Resumen ejecutivo conciso de 2-3 líneas sobre el estado general de la organización",
  "key_insights": [
    "Insight estratégico clave 1 (máximo 100 caracteres)",
    "Insight estratégico clave 2 (máximo 100 caracteres)",
    "Insight estratégico clave 3 (máximo 100 caracteres)"
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "Título de la recomendación",
      "description": "Descripción concisa de la acción recomendada",
      "impact": "Impacto esperado de implementar esta recomendación"
    }
  ],
  "risks": [
    {
      "level": "critical|high|medium|low",
      "title": "Título del riesgo",
      "description": "Descripción del riesgo identificado",
      "mitigation": "Estrategia de mitigación sugerida"
    }
  ],
  "opportunities": [
    {
      "title": "Título de la oportunidad",
      "description": "Descripción de la oportunidad identificada",
      "potential_value": "Valor potencial o beneficio esperado"
    }
  ],
  "performance_analysis": {
    "best_performing_area": "Nombre del área con mejor desempeño",
    "needs_attention_area": "Nombre del área que necesita atención",
    "overall_trend": "improving|stable|declining",
    "trend_explanation": "Explicación breve de la tendencia observada"
  },
  "metrics_highlights": {
    "positive": ["Métrica positiva destacada 1", "Métrica positiva destacada 2"],
    "negative": ["Métrica negativa o preocupante 1", "Métrica negativa o preocupante 2"],
    "neutral": ["Observación neutral relevante"]
  }
}

Considera:
1. El progreso promedio de las iniciativas
2. La distribución de estados de las iniciativas
3. El desempeño por área
4. Las iniciativas en riesgo o vencidas
5. La actividad del equipo
6. Las tendencias temporales si están disponibles

Sé específico, accionable y enfócate en insights que agreguen valor para la toma de decisiones ejecutivas.
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Parse the JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
    }

    // Fallback insights if AI generation fails
    return {
      summary: "El análisis de datos está temporalmente limitado. Por favor, revise las métricas directamente.",
      key_insights: [
        `${dashboardData.overall_metrics?.total_initiatives || 0} iniciativas en progreso`,
        `Progreso promedio: ${Math.round(dashboardData.overall_metrics?.average_progress || 0)}%`,
        `${dashboardData.overall_metrics?.total_areas || 0} áreas activas`
      ],
      recommendations: [
        {
          priority: "medium",
          title: "Revisar iniciativas",
          description: "Analice el progreso de las iniciativas actuales",
          impact: "Mejora en la ejecución de proyectos"
        }
      ],
      risks: [],
      opportunities: [],
      performance_analysis: {
        best_performing_area: "Por determinar",
        needs_attention_area: "Por determinar",
        overall_trend: "stable",
        trend_explanation: "Análisis en proceso"
      },
      metrics_highlights: {
        positive: ["Sistema funcionando correctamente"],
        negative: [],
        neutral: ["Datos actualizados al momento"]
      }
    }

  } catch (error) {
    console.error('AI generation error:', error)
    
    // Return fallback insights
    return {
      summary: "Insights automáticos temporalmente no disponibles. Datos básicos mostrados.",
      key_insights: [
        "Sistema de insights en mantenimiento",
        "Métricas básicas disponibles",
        "Actualización manual requerida"
      ],
      recommendations: [],
      risks: [],
      opportunities: [],
      performance_analysis: {
        best_performing_area: "N/A",
        needs_attention_area: "N/A",
        overall_trend: "stable",
        trend_explanation: "Análisis no disponible"
      },
      metrics_highlights: {
        positive: [],
        negative: [],
        neutral: ["Reintente más tarde"]
      }
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