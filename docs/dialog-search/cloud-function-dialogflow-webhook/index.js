/**
 * Cloud Function Webhook para Dialogflow CX
 * Permite al bot ejecutar acciones inteligentes basadas en datos
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BIGQUERY_PROJECT = process.env.GCLOUD_PROJECT_ID || 'insaight-backend';
const BIGQUERY_DATASET = 'gestion_iniciativas';

// Inicializar clientes
const bigquery = new BigQuery({ projectId: BIGQUERY_PROJECT });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Webhook principal para Dialogflow CX
 */
exports.dialogflowWebhook = async (req, res) => {
  console.log('Webhook recibido:', JSON.stringify(req.body, null, 2));
  
  const tag = req.body.fulfillmentInfo?.tag;
  const parameters = req.body.sessionInfo?.parameters || {};
  const session = req.body.sessionInfo?.session;
  
  let responseText = '';
  let sessionParameters = {};
  
  try {
    switch (tag) {
      case 'create-initiative':
        responseText = await createInitiative(parameters);
        break;
        
      case 'suggest-initiatives':
        responseText = await suggestInitiatives(parameters);
        break;
        
      case 'analyze-performance':
        responseText = await analyzePerformance(parameters);
        break;
        
      case 'check-capacity':
        responseText = await checkTeamCapacity(parameters);
        break;
        
      default:
        responseText = await handleGeneralQuery(parameters);
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    responseText = 'Lo siento, hubo un error procesando tu solicitud. Por favor, intenta de nuevo.';
  }
  
  // Respuesta para Dialogflow
  const response = {
    fulfillmentResponse: {
      messages: [
        {
          text: {
            text: [responseText]
          }
        }
      ]
    },
    sessionInfo: {
      session: session,
      parameters: {
        ...parameters,
        ...sessionParameters
      }
    }
  };
  
  res.json(response);
};

/**
 * Crear una nueva iniciativa inteligentemente
 */
async function createInitiative(params) {
  console.log('Creando iniciativa con parámetros:', params);
  
  // 1. Analizar iniciativas similares exitosas
  const analysis = await analyzeSimilarInitiatives(params.objective_type || params.area);
  
  // 2. Generar parámetros optimizados
  const optimizedParams = await generateOptimizedParameters(params, analysis);
  
  // 3. Crear la iniciativa en Supabase
  const { data: newInitiative, error } = await supabase
    .from('initiatives')
    .insert({
      title: optimizedParams.title,
      description: optimizedParams.description,
      tenant_id: params.tenant_id || 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', // Default SIGA
      area_id: optimizedParams.area_id,
      created_by: params.user_id || 'system-ai',
      start_date: optimizedParams.start_date,
      due_date: optimizedParams.due_date,
      status: 'planning',
      progress: 0
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creando iniciativa:', error);
    return 'No pude crear la iniciativa. Por favor, verifica los datos e intenta de nuevo.';
  }
  
  // 4. Crear actividades sugeridas
  if (optimizedParams.suggested_activities?.length > 0) {
    const activities = optimizedParams.suggested_activities.map(activity => ({
      initiative_id: newInitiative.id,
      title: activity.title,
      description: activity.description,
      is_completed: false
    }));
    
    await supabase.from('activities').insert(activities);
  }
  
  return `✅ He creado la iniciativa "${optimizedParams.title}" con éxito!

📊 **Detalles:**
- **Duración estimada**: ${optimizedParams.duration_days} días
- **Fecha inicio**: ${optimizedParams.start_date}
- **Fecha fin**: ${optimizedParams.due_date}
- **Actividades creadas**: ${optimizedParams.suggested_activities?.length || 0}

📈 **Basado en el análisis:**
- Iniciativas similares tuvieron ${analysis.avg_success_rate}% de éxito
- Duración promedio: ${analysis.avg_duration} días
- ROI esperado: ${analysis.expected_roi}%

¿Te gustaría que agregue más actividades o ajuste algún parámetro?`;
}

/**
 * Sugerir iniciativas basadas en datos históricos y gaps
 */
async function suggestInitiatives(params) {
  console.log('Sugiriendo iniciativas para:', params);
  
  // 1. Identificar gaps en objetivos
  const gapsQuery = `
    SELECT 
      o.id,
      o.title as objective_title,
      o.progress,
      o.target_date,
      o.area_id,
      a.name as area_name,
      COUNT(oi.initiative_id) as initiative_count
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objectives\` o
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi ON o.id = oi.objective_id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.areas\` a ON o.area_id = a.area_id
    WHERE o.progress < 50
      AND o.status != 'completed'
    GROUP BY o.id, o.title, o.progress, o.target_date, o.area_id, a.name
    HAVING initiative_count < 2
    ORDER BY o.progress ASC
    LIMIT 5
  `;
  
  // 2. Analizar iniciativas exitosas
  const successQuery = `
    SELECT 
      title,
      description,
      area_id,
      TIMESTAMP_DIFF(TIMESTAMP(fecha_fin), TIMESTAMP(fecha_inicio), DAY) as duration_days,
      progreso_actual as final_progress
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.iniciativas\`
    WHERE progreso_actual >= 80
      AND estado = 'completed'
    ORDER BY progreso_actual DESC
    LIMIT 10
  `;
  
  const [gaps] = await bigquery.query({ query: gapsQuery });
  const [successes] = await bigquery.query({ query: successQuery });
  
  // 3. Generar sugerencias inteligentes
  let suggestions = [];
  
  for (const gap of gaps.slice(0, 3)) {
    const suggestion = {
      title: `Impulsar ${gap.objective_title}`,
      justification: `Objetivo con solo ${gap.progress}% de progreso y ${gap.initiative_count} iniciativas activas`,
      area: gap.area_name,
      urgency: calculateUrgency(gap.target_date, gap.progress),
      recommended_duration: calculateRecommendedDuration(successes),
      similar_successes: findSimilarSuccesses(successes, gap.area_id)
    };
    suggestions.push(suggestion);
  }
  
  // 4. Formato de respuesta
  let response = '🎯 **Iniciativas Sugeridas Basadas en Análisis de Datos:**\n\n';
  
  suggestions.forEach((s, i) => {
    response += `**${i + 1}. ${s.title}**\n`;
    response += `📊 Justificación: ${s.justification}\n`;
    response += `🏢 Área: ${s.area}\n`;
    response += `⚡ Urgencia: ${s.urgency}/10\n`;
    response += `📅 Duración recomendada: ${s.recommended_duration} días\n`;
    if (s.similar_successes.length > 0) {
      response += `✅ Basado en éxitos similares: ${s.similar_successes[0].title}\n`;
    }
    response += '\n';
  });
  
  response += '¿Te gustaría que cree alguna de estas iniciativas o necesitas más detalles?';
  
  return response;
}

/**
 * Analizar el rendimiento actual
 */
async function analyzePerformance(params) {
  const area = params.area_id || null;
  const timeframe = params.timeframe || '30'; // días
  
  const query = `
    WITH performance_metrics AS (
      SELECT 
        COUNT(DISTINCT i.iniciativa_id) as total_initiatives,
        AVG(i.progreso_actual) as avg_progress,
        COUNT(DISTINCT CASE WHEN i.estado = 'completed' THEN i.iniciativa_id END) as completed,
        COUNT(DISTINCT CASE WHEN i.estado = 'on_hold' THEN i.iniciativa_id END) as on_hold,
        COUNT(DISTINCT a.id) as total_activities,
        COUNT(DISTINCT CASE WHEN a.is_completed = true THEN a.id END) as completed_activities
      FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.iniciativas\` i
      LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` a ON i.iniciativa_id = a.initiative_id
      WHERE DATE(i.fecha_actualizacion) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${timeframe} DAY)
        ${area ? `AND i.area_id = '${area}'` : ''}
    ),
    trend_analysis AS (
      SELECT 
        DATE(created_at) as date,
        AVG(completed_activities_count * 100.0 / NULLIF(total_activities_count, 0)) as daily_progress
      FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.progress_history\`
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL ${timeframe} DAY)
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    )
    SELECT * FROM performance_metrics
  `;
  
  const [metrics] = await bigquery.query({ query });
  const m = metrics[0];
  
  // Calcular insights
  const completionRate = (m.completed / m.total_initiatives * 100).toFixed(1);
  const activityCompletionRate = (m.completed_activities / m.total_activities * 100).toFixed(1);
  const healthScore = calculateHealthScore(m);
  
  return `📊 **Análisis de Rendimiento (Últimos ${timeframe} días)**

**Métricas Generales:**
- 📈 Iniciativas totales: ${m.total_initiatives}
- ✅ Completadas: ${m.completed} (${completionRate}%)
- ⏸️ En pausa: ${m.on_hold}
- 📊 Progreso promedio: ${m.avg_progress.toFixed(1)}%

**Actividades:**
- 📝 Total: ${m.total_activities}
- ✅ Completadas: ${m.completed_activities} (${activityCompletionRate}%)

**Health Score:** ${healthScore}/100 ${getHealthEmoji(healthScore)}

**Recomendaciones:**
${generateRecommendations(m, healthScore)}

¿Quieres que profundice en algún área específica?`;
}

/**
 * Verificar capacidad del equipo
 */
async function checkTeamCapacity(params) {
  const area_id = params.area_id;
  
  const query = `
    SELECT 
      a.name as area_name,
      COUNT(DISTINCT i.iniciativa_id) as active_initiatives,
      COUNT(DISTINCT act.id) as pending_activities,
      COUNT(DISTINCT up.id) as team_members,
      AVG(i.progreso_actual) as avg_progress
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.areas\` a
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.iniciativas\` i 
      ON a.id = i.area_id AND i.estado IN ('planning', 'in_progress')
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` act 
      ON i.iniciativa_id = act.initiative_id AND act.is_completed = false
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.user_profiles\` up 
      ON a.id = up.area_id
    WHERE a.id = '${area_id}'
    GROUP BY a.name
  `;
  
  const [capacity] = await bigquery.query({ query });
  const c = capacity[0];
  
  const workloadPerPerson = c.pending_activities / c.team_members;
  const capacityScore = calculateCapacityScore(c);
  
  return `👥 **Análisis de Capacidad - ${c.area_name}**

**Equipo:**
- 👤 Miembros: ${c.team_members}
- 📋 Iniciativas activas: ${c.active_initiatives}
- 📝 Actividades pendientes: ${c.pending_activities}
- 📊 Carga por persona: ${workloadPerPerson.toFixed(1)} actividades

**Capacidad disponible:** ${capacityScore}% ${getCapacityEmoji(capacityScore)}

**Recomendación:**
${capacityScore > 70 ? '✅ El equipo tiene capacidad para nuevas iniciativas' : 
  capacityScore > 40 ? '⚠️ Capacidad limitada, priorizar iniciativas críticas' :
  '🚫 Equipo sobrecargado, considerar reasignar recursos'}

¿Te gustaría ver un desglose por miembro del equipo?`;
}

// Funciones auxiliares
async function analyzeSimilarInitiatives(type) {
  const query = `
    SELECT 
      AVG(progreso_actual) as avg_success_rate,
      AVG(TIMESTAMP_DIFF(TIMESTAMP(fecha_fin), TIMESTAMP(fecha_inicio), DAY)) as avg_duration,
      COUNT(*) as sample_size
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.iniciativas\`
    WHERE estado = 'completed'
      AND progreso_actual >= 80
  `;
  
  const [results] = await bigquery.query({ query });
  return {
    avg_success_rate: results[0].avg_success_rate || 75,
    avg_duration: results[0].avg_duration || 30,
    expected_roi: Math.round(results[0].avg_success_rate * 1.2)
  };
}

async function generateOptimizedParameters(params, analysis) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + 3); // Empezar en 3 días
  
  const dueDate = new Date(startDate);
  dueDate.setDate(startDate.getDate() + (analysis.avg_duration || 30));
  
  return {
    title: params.title || `Nueva Iniciativa ${today.toLocaleDateString()}`,
    description: params.description || 'Iniciativa creada por IA basada en análisis de datos históricos',
    area_id: params.area_id || 'default-area-id',
    start_date: startDate.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    duration_days: analysis.avg_duration || 30,
    suggested_activities: [
      { title: 'Análisis inicial y planificación', description: 'Definir alcance y objetivos específicos' },
      { title: 'Asignación de recursos', description: 'Identificar y asignar equipo de trabajo' },
      { title: 'Desarrollo de entregables', description: 'Ejecutar plan de trabajo' },
      { title: 'Revisión y ajustes', description: 'Evaluar progreso y realizar ajustes necesarios' },
      { title: 'Cierre y documentación', description: 'Documentar lecciones aprendidas' }
    ]
  };
}

function calculateUrgency(targetDate, currentProgress) {
  if (!targetDate) return 5;
  
  const daysRemaining = Math.floor((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  const progressNeeded = 100 - currentProgress;
  
  if (daysRemaining < 30 && progressNeeded > 50) return 10;
  if (daysRemaining < 60 && progressNeeded > 30) return 8;
  if (daysRemaining < 90 && progressNeeded > 20) return 6;
  return 4;
}

function calculateRecommendedDuration(successes) {
  if (!successes || successes.length === 0) return 30;
  
  const durations = successes
    .map(s => s.duration_days)
    .filter(d => d > 0 && d < 365);
    
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function findSimilarSuccesses(successes, areaId) {
  return successes.filter(s => s.area_id === areaId).slice(0, 3);
}

function calculateHealthScore(metrics) {
  const completionWeight = 0.3;
  const progressWeight = 0.3;
  const activityWeight = 0.4;
  
  const completionScore = (metrics.completed / metrics.total_initiatives) * 100 * completionWeight;
  const progressScore = metrics.avg_progress * progressWeight;
  const activityScore = (metrics.completed_activities / metrics.total_activities) * 100 * activityWeight;
  
  return Math.round(completionScore + progressScore + activityScore);
}

function getHealthEmoji(score) {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

function calculateCapacityScore(capacity) {
  const idealWorkload = 5; // actividades por persona
  const currentWorkload = capacity.pending_activities / capacity.team_members;
  
  if (currentWorkload < idealWorkload) {
    return Math.round((1 - currentWorkload / idealWorkload) * 100);
  }
  return 0;
}

function getCapacityEmoji(score) {
  if (score >= 70) return '🟢';
  if (score >= 40) return '🟡';
  if (score >= 20) return '🟠';
  return '🔴';
}

function generateRecommendations(metrics, healthScore) {
  const recommendations = [];
  
  if (healthScore < 50) {
    recommendations.push('🚨 Revisar iniciativas en pausa y reactivar las prioritarias');
  }
  
  if (metrics.avg_progress < 40) {
    recommendations.push('📈 Incrementar el ritmo de ejecución en iniciativas activas');
  }
  
  if (metrics.on_hold > metrics.completed) {
    recommendations.push('⚠️ Muchas iniciativas en pausa - evaluar causas y recursos');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ El rendimiento es óptimo, mantener el ritmo actual');
  }
  
  return recommendations.join('\n');
}

async function handleGeneralQuery(params) {
  return 'Puedo ayudarte a crear iniciativas, analizar rendimiento o sugerir mejoras. ¿Qué necesitas?';
}