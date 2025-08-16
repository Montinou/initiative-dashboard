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
Eres un asesor estratégico C-level especializado en análisis ejecutivo para CEOs y alta dirección.
Audiencia: CEO, Presidente, Director General - TOMADORES DE DECISIONES ESTRATÉGICAS.

CONTEXTO ESTRATÉGICO ORGANIZACIONAL:
${JSON.stringify(dashboardData, null, 2)}

MISIÓN EJECUTIVA: Generar insights ESTRATÉGICOS para la TOMA DE DECISIONES de alto impacto organizacional.

ANÁLISIS EJECUTIVO REQUERIDO:
1. 📊 EVALUAR salud organizacional y capacidad de ejecución estratégica
2. 💰 CUANTIFICAR impacto financiero y valor de oportunidades detectadas  
3. 🎯 PRIORIZAR decisiones estratégicas por ROI, riesgo e impacto organizacional
4. 🚀 RECOMENDAR acciones ejecutivas con horizonte temporal y recursos requeridos
5. ⚡ IDENTIFICAR decisiones críticas que solo el CEO puede tomar

CRITERIOS ESTRATÉGICOS CEO:
- Decisiones con impacto organizacional significativo (no operativo)
- Recomendaciones de inversión, reestructuración o cambio estratégico
- Análisis de capacidades organizacionales vs. objetivos estratégicos
- Identificación de oportunidades de crecimiento o eficiencia organizacional
- Riesgos sistémicos que requieren decisión ejecutiva
- Perspectiva de 6-18 meses, no semanal
- Lenguaje ejecutivo con métricas de negocio (ROI, eficiencia, capacidad)

FORMATO EJECUTIVO (JSON ESTRICTO):
{
  "summary": "Diagnóstico estratégico: Capacidad organizacional actual + 2 decisiones ejecutivas críticas",
  "key_insights": [
    "Patrón estratégico con impacto organizacional cuantificado",
    "Brecha de capacidad vs. objetivos estratégicos identificada",
    "Oportunidad de valor organizacional con ROI estimado"
  ],
  "recommendations": [
    {
      "priority": "high",
      "title": "Decisión estratégica para el CEO",
      "description": "DECISIÓN requerida, INVERSIÓN necesaria, HORIZONTE temporal estratégico",
      "impact": "Impacto organizacional cuantificado: incremento X% en capacidad/ingresos",
      "effort_level": "low|medium|high",
      "timeline_days": "90-180",
      "success_metric": "KPI estratégico para medir impacto organizacional",
      "investment_required": "Inversión estimada en recursos/capital",
      "strategic_priority": "critical|high|medium"
    }
  ],
  "risks": [
    {
      "level": "critical|high|medium|low",
      "title": "Riesgo estratégico sistémico",
      "description": "Impacto organizacional si no se toma decisión ejecutiva",
      "mitigation": "Decisión estratégica requerida del CEO + inversión + timeline",
      "financial_impact": "Impacto financiero estimado en K/M USD",
      "organizational_impact": "Impacto en capacidades organizacionales"
    }
  ],
  "opportunities": [
    {
      "title": "Oportunidad estratégica con ROI >200%",
      "description": "Oportunidad de crecimiento/eficiencia organizacional",
      "potential_value": "Valor estratégico cuantificado (ingresos/ahorros/capacidad)",
      "implementation_effort": "low|medium|high",
      "strategic_fit": "Alineación con objetivos estratégicos organizacionales",
      "competitive_advantage": "Ventaja competitiva potencial"
    }
  ],
  "performance_analysis": {
    "best_performing_area": "${dashboardData.area_performance?.reduce((best, curr) => curr.avg_progress > best.avg_progress ? curr : best)?.area_name || 'No determinado'}",
    "needs_attention_area": "${dashboardData.area_performance?.reduce((worst, curr) => curr.avg_progress < worst.avg_progress ? curr : worst)?.area_name || 'No determinado'}",
    "overall_trend": "${dashboardData.overall_metrics.average_progress > 75 ? 'improving' : dashboardData.overall_metrics.average_progress > 45 ? 'stable' : 'declining'}",
    "trend_explanation": "Explicación con métricas específicas y comparación",
    "bottlenecks": ["Cuello de botella específico 1", "Cuello de botella específico 2"],
    "efficiency_score": ${Math.round((dashboardData.overall_metrics.completed_initiatives / (dashboardData.overall_metrics.total_initiatives || 1)) * 100)}
  },
  "metrics_highlights": {
    "positive": ["Logro específico con métrica", "Mejora cuantificada"],
    "negative": ["Problema específico con impacto medible", "Riesgo con probabilidad"],
    "neutral": ["Observación objetiva con contexto"]
  }
}

INDICADORES ESTRATÉGICOS ORGANIZACIONALES:
- Portafolio estratégico: ${dashboardData.overall_metrics.total_initiatives} iniciativas organizacionales
- Capacidad de ejecución: ${dashboardData.overall_metrics.average_progress}% progreso promedio
- Eficiencia organizacional: ${Math.round((dashboardData.overall_metrics.completed_initiatives / (dashboardData.overall_metrics.total_initiatives || 1)) * 100)}% tasa de éxito
- Riesgos sistémicos: ${dashboardData.at_risk_initiatives?.length || 0} iniciativas críticas requieren decisión ejecutiva
- Estructura organizacional: ${dashboardData.overall_metrics.total_areas} áreas de negocio activas
- Capacidad vs. demanda: ${dashboardData.overall_metrics.in_progress_initiatives} iniciativas simultáneas en ejecución

CONTEXTO EJECUTIVO: Generar insights para decisiones estratégicas de ALTO IMPACTO ORGANIZACIONAL.

RESPONDE ÚNICAMENTE CON EL JSON EJECUTIVO. NO agregues texto antes o después.`

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

  const atRiskCount = dashboardData.at_risk_initiatives?.length || 0
  const efficiencyScore = completionRate

  return {
    summary: `Organización con ${dashboardData.overall_metrics?.total_initiatives || 0} iniciativas (${completionRate}% completadas). ACCIÓN CRÍTICA: ${atRiskCount > 0 ? `Atender ${atRiskCount} iniciativas en riesgo inmediato` : 'Mantener ritmo actual de ejecución'}.`,
    key_insights: [
      `Eficiencia actual: ${completionRate}% de iniciativas completadas exitosamente`,
      `${atRiskCount > 3 ? 'ALERTA: ' : ''}${atRiskCount} iniciativas requieren intervención urgente (<30 días)`,
      `${bestArea ? `Área líder ${bestArea.area_name}: ${bestArea.avg_progress}% vs ${worstArea?.avg_progress}% del área más rezagada` : 'Desempeño uniforme entre áreas'}`
    ],
    recommendations: [
      {
        priority: atRiskCount > 3 ? "high" : "medium",
        title: `Intervención urgente en ${atRiskCount} iniciativas críticas`,
        description: `QUIÉN: Gerentes de área afectados. QUÉ: Reasignar recursos y revisar alcance. CUÁNDO: En los próximos 7 días`,
        impact: `Prevenir pérdida estimada del ${Math.round(atRiskCount * 15)}% de valor entregable`,
        effort_level: "medium",
        timeline_days: 7,
        success_metric: `Reducir iniciativas en riesgo a <${Math.max(1, Math.round(atRiskCount/2))}`
      },
      {
        priority: bestArea && worstArea ? "high" : "low",
        title: bestArea ? `Replicar modelo exitoso de ${bestArea.area_name}` : "Estandarizar procesos de ejecución",
        description: bestArea ? `QUIÉN: Manager de ${bestArea.area_name} + equipos de otras áreas. QUÉ: Documentar y transferir mejores prácticas. CUÁNDO: 21 días` : "Establecer procedimientos estándar de seguimiento",
        impact: `Incrementar progreso promedio organizacional en ${bestArea ? Math.round((bestArea.avg_progress - avgProgress) * 0.7) : 10}%`,
        effort_level: "low",
        timeline_days: 21,
        success_metric: `Elevar progreso promedio general a ${avgProgress + 15}%`
      }
    ],
    risks: atRiskCount > 0 ? [
      {
        level: atRiskCount > 5 ? "critical" : atRiskCount > 2 ? "high" : "medium",
        title: `${atRiskCount} iniciativas con probabilidad 70% de incumplimiento de fecha`,
        description: `Impacto proyectado: Retraso de ${Math.round(atRiskCount * 2.5)} semanas en entregables organizacionales`,
        mitigation: `ACCIÓN: Reunión semanal de seguimiento por 4 semanas + reasignación de recursos críticos`,
        financial_impact: `Estimado: ${atRiskCount * 25}k USD en costos de oportunidad y recursos adicionales`
      }
    ] : [
      {
        level: "low",
        title: "Riesgo de complacencia por buen desempeño",
        description: "Sin iniciativas en riesgo crítico, posible relajación en controles",
        mitigation: "Mantener reuniones de seguimiento quincenal y métricas de early warning",
        financial_impact: "Potencial reducción 5-10% en velocidad de ejecución futura"
      }
    ],
    opportunities: [
      {
        title: bestArea ? `ROI 200%: Escalar metodología de ${bestArea.area_name} a toda la organización` : "Quick win: Optimización de procesos actuales",
        description: bestArea ? `Transferir framework que logró ${bestArea.avg_progress}% vs ${avgProgress}% promedio` : "Identificar y eliminar 3 cuellos de botella principales",
        potential_value: bestArea ? `Ahorro estimado: ${Math.round((bestArea.avg_progress - avgProgress) * 0.5 * dashboardData.overall_metrics?.total_initiatives * 2)}k USD en eficiencias` : "Reducción 15-20% en tiempo de ciclo de iniciativas",
        implementation_effort: "low",
        quick_wins: bestArea && (bestArea.avg_progress - avgProgress) > 20 ? "true" : "false"
      }
    ],
    performance_analysis: {
      best_performing_area: bestArea?.area_name || "Rendimiento uniforme",
      needs_attention_area: worstArea?.area_name || "Todas las áreas estables",
      overall_trend: avgProgress > 75 ? "improving" : avgProgress > 45 ? "stable" : "declining",
      trend_explanation: `Eficiencia organizacional: ${efficiencyScore}%. ${atRiskCount > 2 ? 'Tendencia descendente por acumulación de riesgos' : 'Ritmo sostenible de ejecución'}`,
      bottlenecks: [
        atRiskCount > 0 ? `${atRiskCount} iniciativas estancadas requieren escalation` : "Flujo de trabajo optimizado",
        worstArea && bestArea ? `Brecha de rendimiento: ${Math.round(bestArea.avg_progress - worstArea.avg_progress)}% entre áreas` : "Rendimiento equilibrado entre áreas"
      ],
      efficiency_score: efficiencyScore
    },
    metrics_highlights: {
      positive: [
        `Tasa de éxito: ${completionRate}% de iniciativas completadas exitosamente`,
        dashboardData.recent_achievements?.length > 0 ? `${dashboardData.recent_achievements.length} logros entregados en última semana` : `${dashboardData.overall_metrics?.completed_initiatives || 0} iniciativas finalizadas`
      ].filter(Boolean),
      negative: [
        atRiskCount > 0 ? `CRÍTICO: ${atRiskCount} iniciativas con riesgo alto de incumplimiento (probabilidad >70%)` : null,
        avgProgress < 50 ? `Velocidad de progreso: ${avgProgress}% - por debajo del benchmark 60%` : null
      ].filter(Boolean),
      neutral: [
        `Portafolio activo: ${dashboardData.overall_metrics?.total_areas || 0} áreas ejecutando ${dashboardData.overall_metrics?.total_initiatives || 0} iniciativas simultáneamente`
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