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
  console.log('Request source:', req.headers['user-agent']);
  console.log('Request method:', req.method);
  
  const tag = req.body.fulfillmentInfo?.tag;
  const parameters = req.body.sessionInfo?.parameters || {};
  const session = req.body.sessionInfo?.session;
  
  // También manejar el parámetro action para compatibilidad
  const action = parameters.action || tag;
  
  let responseText = '';
  let sessionParameters = {};
  
  try {
    switch (action) {
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
      case 'analyzeCapacity':
        responseText = await checkTeamCapacity(parameters);
        break;
        
      case 'createObjective':
        responseText = await createObjective(parameters);
        break;
        
      case 'suggestObjectives':
        responseText = await suggestObjectives(parameters);
        break;
        
      case 'createActivity':
        responseText = await createActivity(parameters);
        break;
        
      case 'assignActivity':
        responseText = await assignActivity(parameters);
        break;
        
      case 'query-objectives':
      case 'query_objectives':
        responseText = await queryObjectives(parameters);
        break;
        
      case 'query-activities':
      case 'query_activities':
        responseText = await queryActivities(parameters);
        break;
        
      case 'analyze-relationships':
      case 'analyze_relationships':
        responseText = await analyzeRelationships(parameters);
        break;
        
      case 'query-initiatives':
      case 'query_initiatives':
        responseText = await queryInitiatives(parameters);
        break;
        
      case 'general-query':
      case 'general_query':
        responseText = await handleGeneralQuery(parameters);
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
 * Verificar capacidad del equipo y mostrar iniciativas
 */
async function checkTeamCapacity(params) {
  console.log('checkTeamCapacity called with params:', params);
  
  // Si no hay area_id específica, mostrar iniciativas generales
  if (!params.area_id) {
    console.log('No area_id provided, showing general initiatives');
    return await queryInitiatives(params);
  }
  
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

/**
 * Consultar iniciativas con detalles completos
 */
async function queryInitiatives(params) {
  console.log('Consultando iniciativas:', params);
  
  const tenantId = params.tenant_id || 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c';
  const userRole = params.user_role || 'Manager';
  const userAreaId = params.user_area_id;
  
  // Construir query base con Supabase
  let query = supabase
    .from('initiatives')
    .select(`
      *,
      areas(name),
      activities(id, is_completed),
      objective_initiatives(
        objectives(title)
      )
    `)
    // .eq('tenant_id', tenantId); // Not needed with RLS enabled
  
  // Si es Manager, limitar a su área
  if (userRole === 'Manager' && userAreaId) {
    query = query.eq('area_id', userAreaId);
  }
  
  // Aplicar filtros adicionales si se proporcionan
  if (params.area_id) {
    query = query.eq('area_id', params.area_id);
  }
  
  if (params.status) {
    query = query.eq('status', params.status);
  }
  
  // Ordenar por progreso y limitar resultados
  query = query.order('progress', { ascending: false }).limit(20);
  
  const { data: initiatives, error } = await query;
  
  if (error) {
    console.error('Error consultando iniciativas:', error);
    return 'Hubo un error al consultar las iniciativas. Por favor, intenta de nuevo.';
  }
  
  if (!initiatives || initiatives.length === 0) {
    return userRole === 'Manager' 
      ? 'No encontré iniciativas en tu área. Verifica con tu líder si hay nuevas asignaciones.'
      : 'No encontré iniciativas con los criterios especificados.';
  }
  
  // Obtener total de iniciativas para contexto
  const { count: totalCount } = await supabase
    .from('initiatives')
    .select('*', { count: 'exact', head: true })
    // .eq('tenant_id', tenantId); // Not needed with RLS enabled
  
  let response = `🚀 **Iniciativas Encontradas (${initiatives.length} de ${totalCount || initiatives.length} total):**\n\n`;
  
  initiatives.slice(0, 10).forEach((init, i) => {
    // Calcular actividades completadas y totales desde el array
    const totalActivities = init.activities ? init.activities.length : 0;
    const completedActivities = init.activities 
      ? init.activities.filter(a => a.is_completed).length 
      : 0;
    const completionRate = totalActivities > 0 
      ? Math.round((completedActivities / totalActivities) * 100)
      : 0;
    
    // Obtener el primer objetivo si existe
    const objectiveTitle = init.objective_initiatives && init.objective_initiatives.length > 0
      ? init.objective_initiatives[0].objectives?.title
      : null;
    
    response += `**${i + 1}. ${init.title}**\n`;
    response += `📊 Progreso: ${init.progress || 0}% | Estado: ${init.status || 'in_progress'}\n`;
    response += `🏢 Área: ${init.areas?.name || 'Sin área'}\n`;
    
    if (objectiveTitle) {
      response += `🎯 Objetivo: ${objectiveTitle}\n`;
    }
    
    response += `✅ Actividades: ${completedActivities}/${totalActivities} (${completionRate}%)\n`;
    
    if (init.due_date) {
      const daysRemaining = Math.floor((new Date(init.due_date) - new Date()) / (1000 * 60 * 60 * 24));
      response += `📅 Fecha límite: ${new Date(init.due_date).toLocaleDateString()} (${daysRemaining} días)\n`;
    }
    response += '\n';
  });
  
  if (initiatives.length > 10) {
    response += `... y ${initiatives.length - 10} iniciativas más.\n`;
  }
  
  return response;
}

/**
 * Consultar objetivos con sus relaciones
 */
async function queryObjectives(params) {
  console.log('Consultando objetivos:', params);
  
  const query = `
    SELECT 
      o.id,
      o.title,
      o.description,
      o.progress,
      o.status,
      o.priority,
      o.target_date,
      a.name as area_name,
      COUNT(DISTINCT oi.initiative_id) as initiative_count,
      AVG(i.progress) as avg_initiative_progress,
      COUNT(DISTINCT act.id) as total_activities,
      COUNT(DISTINCT CASE WHEN act.is_completed = true THEN act.id END) as completed_activities
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objectives\` o
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.areas\` a ON o.area_id = a.id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi ON o.id = oi.objective_id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.initiatives\` i ON oi.initiative_id = i.id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` act ON i.id = act.initiative_id
    ${params.area_id ? `WHERE o.area_id = '${params.area_id}'` : ''}
    GROUP BY o.id, o.title, o.description, o.progress, o.status, o.priority, o.target_date, a.name
    ORDER BY o.priority DESC, o.progress ASC
    LIMIT 10
  `;
  
  const [objectives] = await bigquery.query({ query });
  
  if (objectives.length === 0) {
    return 'No encontré objetivos con los criterios especificados.';
  }
  
  let response = `📎 **Objetivos Estratégicos Encontrados (${objectives.length}):**\n\n`;
  
  objectives.forEach((obj, i) => {
    const completionRate = obj.total_activities > 0 
      ? Math.round((obj.completed_activities / obj.total_activities) * 100)
      : 0;
    
    response += `**${i + 1}. ${obj.title}**\n`;
    response += `📊 Progreso: ${obj.progress}% | Estado: ${obj.status}\n`;
    response += `🎯 Prioridad: ${obj.priority} | Área: ${obj.area_name || 'Sin asignar'}\n`;
    response += `📈 Iniciativas: ${obj.initiative_count} (Promedio ${Math.round(obj.avg_initiative_progress || 0)}%)\n`;
    response += `✅ Actividades: ${obj.completed_activities}/${obj.total_activities} (${completionRate}%)\n`;
    
    if (obj.target_date) {
      const daysRemaining = Math.floor((new Date(obj.target_date) - new Date()) / (1000 * 60 * 60 * 24));
      response += `📅 Fecha objetivo: ${obj.target_date} (${daysRemaining} días restantes)\n`;
    }
    response += '\n';
  });
  
  return response;
}

/**
 * Consultar actividades con sus relaciones
 */
async function queryActivities(params) {
  console.log('Consultando actividades:', params);
  
  const query = `
    SELECT 
      a.id,
      a.title as activity_title,
      a.description as activity_description,
      a.is_completed,
      a.assigned_to,
      i.id as initiative_id,
      i.title as initiative_title,
      i.progress as initiative_progress,
      ar.name as area_name,
      up.full_name as assigned_to_name,
      o.title as objective_title
    FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` a
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.initiatives\` i ON a.initiative_id = i.id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.areas\` ar ON i.area_id = ar.id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.user_profiles\` up ON a.assigned_to = up.id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi ON i.id = oi.initiative_id
    LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objectives\` o ON oi.objective_id = o.id
    WHERE 1=1
    ${params.initiative_id ? `AND a.initiative_id = '${params.initiative_id}'` : ''}
    ${params.is_completed !== undefined ? `AND a.is_completed = ${params.is_completed}` : ''}
    ${params.assigned_to ? `AND a.assigned_to = '${params.assigned_to}'` : ''}
    ORDER BY a.is_completed ASC, a.created_at DESC
    LIMIT 20
  `;
  
  const [activities] = await bigquery.query({ query });
  
  if (activities.length === 0) {
    return 'No encontré actividades con los criterios especificados.';
  }
  
  const pendingActivities = activities.filter(a => !a.is_completed);
  const completedActivities = activities.filter(a => a.is_completed);
  
  let response = `📋 **Actividades Encontradas (${activities.length}):**\n\n`;
  
  if (pendingActivities.length > 0) {
    response += `**⏳ Pendientes (${pendingActivities.length}):**\n`;
    pendingActivities.slice(0, 5).forEach((act, i) => {
      response += `${i + 1}. ${act.activity_title}\n`;
      response += `   → Iniciativa: ${act.initiative_title}\n`;
      response += `   → Objetivo: ${act.objective_title || 'Sin objetivo vinculado'}\n`;
      response += `   → Asignado a: ${act.assigned_to_name || 'Sin asignar'}\n`;
    });
    response += '\n';
  }
  
  if (completedActivities.length > 0) {
    response += `**✅ Completadas (${completedActivities.length}):**\n`;
    completedActivities.slice(0, 3).forEach((act, i) => {
      response += `${i + 1}. ${act.activity_title}\n`;
      response += `   → Iniciativa: ${act.initiative_title}\n`;
    });
  }
  
  return response;
}

/**
 * Analizar relaciones entre objetivos, iniciativas y actividades
 */
async function analyzeRelationships(params) {
  console.log('Analizando relaciones:', params);
  
  // Query para analizar la salud de las relaciones
  const query = `
    WITH relationship_analysis AS (
      SELECT 
        'objectives_without_initiatives' as metric,
        COUNT(*) as value
      FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objectives\` o
      WHERE NOT EXISTS (
        SELECT 1 FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi
        WHERE oi.objective_id = o.id
      )
      
      UNION ALL
      
      SELECT 
        'initiatives_without_objectives' as metric,
        COUNT(*) as value
      FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.initiatives\` i
      WHERE NOT EXISTS (
        SELECT 1 FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi
        WHERE oi.initiative_id = i.id
      )
      
      UNION ALL
      
      SELECT 
        'initiatives_without_activities' as metric,
        COUNT(*) as value
      FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.initiatives\` i
      WHERE NOT EXISTS (
        SELECT 1 FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` a
        WHERE a.initiative_id = i.id
      )
      
      UNION ALL
      
      SELECT 
        'avg_activities_per_initiative' as metric,
        AVG(activity_count) as value
      FROM (
        SELECT i.id, COUNT(a.id) as activity_count
        FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.initiatives\` i
        LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.activities\` a ON i.id = a.initiative_id
        GROUP BY i.id
      )
      
      UNION ALL
      
      SELECT 
        'avg_initiatives_per_objective' as metric,
        AVG(initiative_count) as value
      FROM (
        SELECT o.id, COUNT(oi.initiative_id) as initiative_count
        FROM \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objectives\` o
        LEFT JOIN \`${BIGQUERY_PROJECT}.${BIGQUERY_DATASET}.objective_initiatives\` oi ON o.id = oi.objective_id
        GROUP BY o.id
      )
    )
    SELECT * FROM relationship_analysis
  `;
  
  const [metrics] = await bigquery.query({ query });
  
  const metricsMap = {};
  metrics.forEach(m => {
    metricsMap[m.metric] = Math.round(m.value);
  });
  
  let response = `🔗 **Análisis de Relaciones entre Objetivos, Iniciativas y Actividades:**\n\n`;
  
  response += `**📊 Métricas de Cobertura:**\n`;
  response += `• Objetivos sin iniciativas: ${metricsMap.objectives_without_initiatives || 0}\n`;
  response += `• Iniciativas sin objetivos: ${metricsMap.initiatives_without_objectives || 0}\n`;
  response += `• Iniciativas sin actividades: ${metricsMap.initiatives_without_activities || 0}\n\n`;
  
  response += `**📈 Promedios:**\n`;
  response += `• Iniciativas por objetivo: ${metricsMap.avg_initiatives_per_objective || 0}\n`;
  response += `• Actividades por iniciativa: ${metricsMap.avg_activities_per_initiative || 0}\n\n`;
  
  // Recomendaciones basadas en el análisis
  response += `**💡 Recomendaciones:**\n`;
  
  if (metricsMap.objectives_without_initiatives > 0) {
    response += `⚠️ Hay ${metricsMap.objectives_without_initiatives} objetivos sin iniciativas asociadas. Considera crear iniciativas para estos objetivos.\n`;
  }
  
  if (metricsMap.initiatives_without_objectives > 0) {
    response += `⚠️ Hay ${metricsMap.initiatives_without_objectives} iniciativas sin objetivos. Vincula estas iniciativas a objetivos estratégicos.\n`;
  }
  
  if (metricsMap.initiatives_without_activities > 0) {
    response += `⚠️ Hay ${metricsMap.initiatives_without_activities} iniciativas sin actividades. Desglosa estas iniciativas en tareas específicas.\n`;
  }
  
  if (metricsMap.avg_activities_per_initiative < 3) {
    response += `📌 El promedio de actividades por iniciativa es bajo (${metricsMap.avg_activities_per_initiative}). Considera desglosar más las iniciativas.\n`;
  }
  
  return response;
}

async function handleGeneralQuery(params) {
  console.log('handleGeneralQuery called with params:', params);
  
  // Para cualquier consulta general, mostrar automáticamente las iniciativas actuales
  const initiativesResult = await queryInitiatives(params);
  
  return `👋 ¡Hola! Soy tu asistente de gestión de iniciativas.

${initiativesResult}

💡 **También puedo ayudarte con:**
• Crear nuevas iniciativas optimizadas
• Analizar rendimiento y KPIs
• Consultar objetivos estratégicos
• Revisar capacidad del equipo
• Sugerir mejoras basadas en datos

¿Hay algo específico que te gustaría saber o hacer?`;
}

/**
 * Crear un nuevo objetivo estratégico
 */
async function createObjective(params) {
  console.log('Creando objetivo con parámetros:', params);
  
  try {
    const { data: newObjective, error } = await supabase
      .from('objectives')
      .insert({
        title: params.title || 'Nuevo objetivo estratégico',
        description: params.description || 'Objetivo creado por IA',
        tenant_id: params.tenant_id || 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c', // Default SIGA
        area_id: params.area_id,
        created_by: params.user_id || 'system-ai',
        priority: params.priority || 'medium',
        status: 'planning',
        progress: 0
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creando objetivo:', error);
      return 'No pude crear el objetivo. Por favor, verifica los datos e intenta de nuevo.';
    }
    
    return `✅ He creado el objetivo estratégico "${newObjective.title}" con éxito!

📊 **Detalles:**
- **ID**: ${newObjective.id}
- **Prioridad**: ${newObjective.priority}
- **Estado**: ${newObjective.status}

🎯 **Próximos pasos sugeridos:**
- Vincular iniciativas existentes a este objetivo
- Definir métricas específicas de éxito
- Asignar responsable del área

¿Te gustaría que ayude con alguno de estos pasos?`;
    
  } catch (error) {
    console.error('Error en createObjective:', error);
    return 'Ocurrió un error al crear el objetivo. Por favor, intenta de nuevo.';
  }
}

/**
 * Sugerir objetivos basados en análisis
 */
async function suggestObjectives(params) {
  console.log('Sugiriendo objetivos:', params);
  
  // Consultar objetivos existentes para análisis
  const { data: existingObjectives, error } = await supabase
    .from('objectives')
    .select(`
      *,
      areas(name),
      objective_initiatives(
        initiatives(title, progress, status)
      )
    `)
    .limit(10);
    
  if (error) {
    console.error('Error consultando objetivos:', error);
    return 'No pude analizar los objetivos existentes.';
  }
  
  // Análisis de gaps y sugerencias
  const suggestions = [
    {
      title: "Mejorar Eficiencia Operacional",
      justification: "Optimizar procesos internos para reducir costos y tiempo",
      priority: "high",
      area_suggestion: "Operaciones"
    },
    {
      title: "Expandir Presencia Digital",
      justification: "Fortalecer canales digitales y presencia online",
      priority: "medium",
      area_suggestion: "Comercial"
    },
    {
      title: "Desarrollar Talento Interno",
      justification: "Capacitar equipo y mejorar retención de talento",
      priority: "medium",
      area_suggestion: "Recursos Humanos"
    }
  ];
  
  let response = '🎯 **Objetivos Estratégicos Sugeridos:**\n\n';
  
  suggestions.forEach((s, i) => {
    response += `**${i + 1}. ${s.title}**\n`;
    response += `📋 Justificación: ${s.justification}\n`;
    response += `⚡ Prioridad: ${s.priority}\n`;
    response += `🏢 Área sugerida: ${s.area_suggestion}\n\n`;
  });
  
  response += '¿Te gustaría que cree alguno de estos objetivos o necesitas sugerencias más específicas?';
  
  return response;
}

/**
 * Crear una nueva actividad
 */
async function createActivity(params) {
  console.log('Creando actividad con parámetros:', params);
  
  try {
    // Extraer contexto del usuario
    const userRole = params.user_role || 'Manager';
    const userAreaId = params.user_area_id;
    const tenantId = params.tenant_id || 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c';
    
    // Si no se proporciona initiative_id, buscar iniciativas relevantes
    let targetInitiativeId = params.initiative_id;
    
    if (!targetInitiativeId && params.initiative_name) {
      // Buscar iniciativa por nombre (parcial) en el área del usuario o tenant
      let initiativeQuery = supabase
        .from('initiatives')
        .select('id, title, area_id')
        .ilike('title', `%${params.initiative_name}%`)
        // .eq('tenant_id', tenantId); // Not needed with RLS enabled
      
      // Si es Manager, limitar a su área
      if (userRole === 'Manager' && userAreaId) {
        initiativeQuery = initiativeQuery.eq('area_id', userAreaId);
      }
      
      const { data: initiatives } = await initiativeQuery.limit(1);
      
      if (initiatives && initiatives.length > 0) {
        targetInitiativeId = initiatives[0].id;
        console.log(`Encontrada iniciativa: ${initiatives[0].title}`);
      } else {
        return `❌ No encontré ninguna iniciativa que coincida con "${params.initiative_name}".${
          userRole === 'Manager' ? ' Búsqueda limitada a tu área.' : ''
        }\n\n💡 Intenta ser más específico con el nombre de la iniciativa.`;
      }
    }
    
    if (!targetInitiativeId) {
      // Si aún no hay initiative_id, obtener la primera iniciativa activa del área/tenant
      let defaultQuery = supabase
        .from('initiatives')
        .select('id, title')
        // .eq('tenant_id', tenantId) // Not needed with RLS enabled
        .eq('status', 'in_progress');
      
      if (userRole === 'Manager' && userAreaId) {
        defaultQuery = defaultQuery.eq('area_id', userAreaId);
      }
      
      const { data: defaultInitiatives } = await defaultQuery.limit(1);
      
      if (defaultInitiatives && defaultInitiatives.length > 0) {
        targetInitiativeId = defaultInitiatives[0].id;
        console.log(`Usando iniciativa predeterminada: ${defaultInitiatives[0].title}`);
      } else {
        return '❌ No hay iniciativas activas disponibles. Primero crea una iniciativa.';
      }
    }
    
    // Si se proporciona nombre de usuario para asignar, buscarlo
    let assignedToId = params.assigned_to;
    
    if (!assignedToId && params.assigned_to_name) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        // .eq('tenant_id', tenantId) // Not needed with RLS enabled
        .ilike('full_name', `%${params.assigned_to_name}%`)
        .limit(1);
      
      if (users && users.length > 0) {
        assignedToId = users[0].id;
        console.log(`Asignando a: ${users[0].full_name}`);
      }
    }
    
    const { data: newActivity, error } = await supabase
      .from('activities')
      .insert({
        initiative_id: targetInitiativeId,
        title: params.title || 'Nueva actividad',
        description: params.description || 'Actividad creada por asistente IA',
        is_completed: false,
        assigned_to: assignedToId
      })
      .select(`
        *,
        initiatives(title, area_id, areas(name)),
        user_profiles(full_name)
      `)
      .single();
      
    if (error) {
      console.error('Error creando actividad:', error);
      return `❌ Error al crear la actividad: ${error.message}`;
    }
    
    return `✅ He creado la actividad "${newActivity.title}" con éxito!

📋 **Detalles:**
- **Iniciativa**: ${newActivity.initiatives?.title || 'No especificada'}
- **Área**: ${newActivity.initiatives?.areas?.name || 'No especificada'}
- **Asignada a**: ${newActivity.user_profiles?.full_name || 'Sin asignar'}
- **Estado**: Pendiente

🚀 **La actividad está lista para ser ejecutada!**

¿Necesitas crear más actividades o asignar esta a alguien específico?`;
    
  } catch (error) {
    console.error('Error en createActivity:', error);
    return 'Ocurrió un error al crear la actividad. Por favor, intenta de nuevo.';
  }
}

/**
 * Asignar actividad a un miembro del equipo
 */
async function assignActivity(params) {
  console.log('Asignando actividad:', params);
  
  try {
    const tenantId = params.tenant_id || 'cd8c12e4-5b6d-4f89-b8a7-2f1d3e4a5b6c';
    const userRole = params.user_role || 'Manager';
    const userAreaId = params.user_area_id;
    
    // Buscar actividad por título o descripción si no se proporciona ID
    let targetActivityId = params.activity_id;
    
    if (!targetActivityId && params.activity_name) {
      let activityQuery = supabase
        .from('activities')
        .select(`
          id, 
          title,
          initiatives!inner(area_id, tenant_id, title)
        `)
        .ilike('title', `%${params.activity_name}%`)
        .eq('initiatives.tenant_id', tenantId);
      
      // Si es Manager, limitar a su área
      if (userRole === 'Manager' && userAreaId) {
        activityQuery = activityQuery.eq('initiatives.area_id', userAreaId);
      }
      
      const { data: activities } = await activityQuery.limit(1);
      
      if (activities && activities.length > 0) {
        targetActivityId = activities[0].id;
        console.log(`Encontrada actividad: ${activities[0].title}`);
      } else {
        return `❌ No encontré ninguna actividad que coincida con "${params.activity_name}".${
          userRole === 'Manager' ? ' Búsqueda limitada a tu área.' : ''
        }`;
      }
    }
    
    // Buscar usuario por nombre si no se proporciona ID
    let targetUserId = params.user_id;
    
    if (!targetUserId && params.user_name) {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name, area_id')
        // .eq('tenant_id', tenantId) // Not needed with RLS enabled
        .ilike('full_name', `%${params.user_name}%`);
      
      // Si es Manager, preferir usuarios de su área
      if (users && users.length > 0) {
        if (userRole === 'Manager' && userAreaId) {
          const areaUser = users.find(u => u.area_id === userAreaId);
          targetUserId = areaUser ? areaUser.id : users[0].id;
        } else {
          targetUserId = users[0].id;
        }
        console.log(`Asignando a usuario: ${users.find(u => u.id === targetUserId)?.full_name}`);
      } else {
        return `❌ No encontré ningún usuario que coincida con "${params.user_name}".`;
      }
    }
    
    if (!targetActivityId) {
      return '❌ No se especificó qué actividad asignar. Proporciona el nombre de la actividad.';
    }
    
    if (!targetUserId) {
      return '❌ No se especificó a quién asignar la actividad. Proporciona el nombre del usuario.';
    }
    
    // Actualizar la actividad
    const { data: updatedActivity, error } = await supabase
      .from('activities')
      .update({
        assigned_to: targetUserId
      })
      .eq('id', targetActivityId)
      .select(`
        *,
        initiatives(title, areas(name)),
        user_profiles(full_name, email)
      `)
      .single();
      
    if (error) {
      console.error('Error asignando actividad:', error);
      return `❌ Error al asignar la actividad: ${error.message}`;
    }
    
    return `✅ Actividad asignada correctamente!

📋 **Detalles:**
- **Actividad**: ${updatedActivity.title}
- **Iniciativa**: ${updatedActivity.initiatives?.title}
- **Área**: ${updatedActivity.initiatives?.areas?.name || 'No especificada'}
- **Asignada a**: ${updatedActivity.user_profiles?.full_name} (${updatedActivity.user_profiles?.email})

👤 **El responsable ha sido notificado de su nueva asignación.**

¿Hay más actividades que necesites asignar?`;
    
  } catch (error) {
    console.error('Error en assignActivity:', error);
    return 'Ocurrió un error al asignar la actividad. Por favor, intenta de nuevo.';
  }
}