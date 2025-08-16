/**
 * Dialogflow CX Webhook Handler for Initiative Data
 * This handles webhook requests from Dialogflow CX and returns initiative data
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Main webhook handler function
 */
async function handleWebhook(req, res) {
  console.log('Webhook request received:', JSON.stringify(req.body));

  try {
    // Extract query from different possible locations in the request
    const sessionInfo = req.body.sessionInfo || {};
    const parameters = sessionInfo.parameters || {};
    
    // Get the user's query text from various possible fields
    const queryText = req.body.text || 
                     req.body.transcript || 
                     req.body.queryInput?.text?.text ||
                     req.body.queryInput?.languageCode ||
                     parameters.lastUserQuery ||
                     '';
    
    // Get the tag from fulfillmentInfo if available
    const tag = req.body.fulfillmentInfo?.tag || '';
    
    console.log('Query text:', queryText);
    console.log('Tag:', tag);
    console.log('Parameters:', parameters);
    
    // Default tenant ID (SIGA)
    const tenantId = parameters.tenant_id || sessionInfo.tenant_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    // Analyze the query to determine what data to fetch
    let response = {};
    const lowerQuery = queryText.toLowerCase();
    
    // Check for specific keywords or use tag to determine the intent
    if (tag === 'get-initiatives' || 
        lowerQuery.includes('iniciativa') || 
        lowerQuery.includes('initiative') ||
        lowerQuery.includes('proyecto')) {
      console.log('Fetching initiatives...');
      response = await getInitiatives(tenantId, parameters);
    } else if (tag === 'get-objectives' || 
               lowerQuery.includes('objetivo') || 
               lowerQuery.includes('objective') ||
               lowerQuery.includes('meta')) {
      console.log('Fetching objectives...');
      response = await getObjectives(tenantId, parameters);
    } else if (tag === 'get-activities' || 
               lowerQuery.includes('actividad') || 
               lowerQuery.includes('activity') ||
               lowerQuery.includes('tarea')) {
      console.log('Fetching activities...');
      response = await getActivities(tenantId, parameters);
    } else if (tag === 'get-dashboard' ||
               lowerQuery.includes('dashboard') ||
               lowerQuery.includes('resumen') ||
               lowerQuery.includes('estado')) {
      console.log('Fetching dashboard summary...');
      response = await getDashboardSummary(tenantId);
    } else {
      // Default: return general dashboard data with a helpful message
      console.log('No specific intent detected, returning dashboard summary...');
      response = await getDashboardSummary(tenantId);
    }
    
    // Return Dialogflow CX webhook response format
    const webhookResponse = {
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: [response.message]
            }
          }
        ]
      },
      sessionInfo: {
        parameters: {
          ...parameters,
          lastQueryResult: response.data,
          lastUserQuery: queryText
        }
      }
    };
    
    console.log('Sending webhook response with message length:', response.message?.length);
    res.status(200).json(webhookResponse);
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    const errorResponse = {
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: ['Lo siento, ocurrió un error al obtener los datos. Por favor, intenta de nuevo.']
            }
          }
        ]
      }
    };
    
    res.status(200).json(errorResponse);
  }
}

/**
 * Get initiatives from database
 */
async function getInitiatives(tenantId, filters = {}) {
  let query = supabase
    .from('initiatives')
    .select(`
      *,
      areas(name),
      activities(id, is_completed),
      objective_initiatives(
        objectives(title, progress)
      )
    `);
    // RLS automatically filters by tenant_id
  
  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  if (filters.area_id) {
    query = query.eq('area_id', filters.area_id);
  }
  
  const { data: initiatives, error } = await query
    .order('progress', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  
  // Format response message
  let message = `📊 Encontré ${initiatives.length} iniciativas:\n\n`;
  
  initiatives.slice(0, 5).forEach((init, index) => {
    const activities = init.activities || [];
    const completedActivities = activities.filter(a => a.is_completed).length;
    
    message += `${index + 1}. **${init.title}**\n`;
    message += `   • Progreso: ${init.progress}%\n`;
    message += `   • Estado: ${init.status || 'en progreso'}\n`;
    message += `   • Área: ${init.areas?.name || 'Sin área'}\n`;
    message += `   • Actividades: ${completedActivities}/${activities.length}\n\n`;
  });
  
  // Add summary
  const avgProgress = initiatives.length > 0
    ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length)
    : 0;
  
  message += `📈 **Resumen:**\n`;
  message += `• Progreso promedio: ${avgProgress}%\n`;
  message += `• Iniciativas completadas: ${initiatives.filter(i => i.status === 'completed').length}\n`;
  message += `• Iniciativas en progreso: ${initiatives.filter(i => i.status === 'in_progress').length}`;
  
  return {
    data: initiatives,
    message: message
  };
}

/**
 * Get objectives from database
 */
async function getObjectives(tenantId, filters = {}) {
  const { data: objectives, error } = await supabase
    .from('objectives')
    .select(`
      *,
      areas(name),
      objective_initiatives(
        initiatives(title, progress, status)
      )
    `)
    // RLS automatically filters by tenant_id
    .limit(10);
  
  if (error) throw error;
  
  let message = `🎯 Encontré ${objectives.length} objetivos:\n\n`;
  
  objectives.slice(0, 5).forEach((obj, index) => {
    const initiatives = obj.objective_initiatives?.map(oi => oi.initiatives).filter(Boolean) || [];
    const avgProgress = initiatives.length > 0
      ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length)
      : 0;
    
    message += `${index + 1}. **${obj.title}**\n`;
    message += `   • Área: ${obj.areas?.name || 'General'}\n`;
    message += `   • Iniciativas: ${initiatives.length}\n`;
    message += `   • Progreso promedio: ${avgProgress}%\n\n`;
  });
  
  return {
    data: objectives,
    message: message
  };
}

/**
 * Get activities from database
 */
async function getActivities(tenantId, filters = {}) {
  const { data: activities, error } = await supabase
    .from('activities')
    .select(`
      *,
      initiatives(
        title,
        tenant_id,
        areas(name)
      ),
      user_profiles!activities_assigned_to_fkey(full_name)
    `)
    .eq('initiatives.tenant_id', tenantId)
    .limit(20);
  
  if (error) throw error;
  
  const pendingActivities = activities.filter(a => !a.is_completed);
  const completedActivities = activities.filter(a => a.is_completed);
  
  let message = `📝 Estado de actividades:\n\n`;
  message += `• Total: ${activities.length}\n`;
  message += `• Completadas: ${completedActivities.length}\n`;
  message += `• Pendientes: ${pendingActivities.length}\n\n`;
  
  if (pendingActivities.length > 0) {
    message += `**Actividades pendientes:**\n`;
    pendingActivities.slice(0, 5).forEach((act, index) => {
      message += `${index + 1}. ${act.title}\n`;
      message += `   • Iniciativa: ${act.initiatives?.title || 'Sin iniciativa'}\n`;
      message += `   • Asignado a: ${act.user_profiles?.full_name || 'Sin asignar'}\n\n`;
    });
  }
  
  return {
    data: activities,
    message: message
  };
}

/**
 * Get dashboard summary
 */
async function getDashboardSummary(tenantId) {
  // Get counts
  const [initiativesResult, objectivesResult, areasResult] = await Promise.all([
    supabase
      .from('initiatives')
      .select('id, progress, status', { count: 'exact' }),
      // RLS automatically filters by tenant_id
    supabase
      .from('objectives')
      .select('id', { count: 'exact' }),
      // RLS automatically filters by tenant_id
    supabase
      .from('areas')
      .select('id, name', { count: 'exact' })
      // RLS automatically filters by tenant_id
      .eq('is_active', true)
  ]);
  
  const initiatives = initiativesResult.data || [];
  const avgProgress = initiatives.length > 0
    ? Math.round(initiatives.reduce((acc, i) => acc + (i.progress || 0), 0) / initiatives.length)
    : 0;
  
  let message = `📊 **Resumen del Dashboard:**\n\n`;
  message += `• **Iniciativas:** ${initiatives.length}\n`;
  message += `• **Objetivos:** ${objectivesResult.data?.length || 0}\n`;
  message += `• **Áreas activas:** ${areasResult.data?.length || 0}\n`;
  message += `• **Progreso promedio:** ${avgProgress}%\n\n`;
  
  message += `**Estado de iniciativas:**\n`;
  message += `• Completadas: ${initiatives.filter(i => i.status === 'completed').length}\n`;
  message += `• En progreso: ${initiatives.filter(i => i.status === 'in_progress').length}\n`;
  message += `• En planificación: ${initiatives.filter(i => i.status === 'planning').length}\n\n`;
  
  message += `¿Qué información específica necesitas? Puedo mostrarte:\n`;
  message += `• Iniciativas por área\n`;
  message += `• Objetivos estratégicos\n`;
  message += `• Actividades pendientes\n`;
  message += `• Métricas de progreso`;
  
  return {
    data: {
      initiatives: initiatives.length,
      objectives: objectivesResult.data?.length || 0,
      areas: areasResult.data?.length || 0,
      avgProgress: avgProgress
    },
    message: message
  };
}

module.exports = { handleWebhook };