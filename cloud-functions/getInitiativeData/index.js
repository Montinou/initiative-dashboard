/**
 * Cloud Function for Dialogflow CX: getInitiativeData
 * Handles both Tool requests and Webhook requests for initiative dashboard data
 */

const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');
const { handleWebhook } = require('./webhookHandler');

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client (initialize inside function to handle missing key gracefully)
let supabase;

functions.http('getInitiativeData', async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  console.log('Request received:', JSON.stringify(req.body));
  console.log('Headers:', req.headers);

  // Check if this is a Dialogflow CX webhook request
  if (req.body.fulfillmentInfo || req.body.sessionInfo || req.body.detectIntentResponseId) {
    console.log('Detected Dialogflow CX webhook request');
    return handleWebhook(req, res);
  }

  // Initialize Supabase client if not already done
  if (!supabase) {
    if (!SUPABASE_SERVICE_KEY) {
      console.error('SUPABASE_SERVICE_KEY is not set');
      res.status(500).json({
        success: false,
        data: [],
        message: 'Configuration error: Missing service key',
        error: 'SUPABASE_SERVICE_KEY not configured'
      });
      return;
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  try {
    // Extract parameters from request
    const { query, filters = {}, tenant } = req.body;
    
    console.log('Processing query:', query);
    console.log('Filters:', filters);
    console.log('Tenant:', tenant);
    
    // Default tenant ID (SIGA) - correct tenant ID from database
    const tenantId = tenant || filters.tenant_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    // Fetch initiatives with related data
    let initiativesQuery = supabase
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
    
    // Apply status filter if provided
    if (filters.status) {
      initiativesQuery = initiativesQuery.eq('status', filters.status);
    }
    
    // Apply date range filter if provided
    if (filters.date_range) {
      const today = new Date();
      let startDate, endDate;
      
      switch(filters.date_range) {
        case 'current_quarter':
          const quarter = Math.floor((today.getMonth() + 3) / 3);
          startDate = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
          endDate = new Date(today.getFullYear(), quarter * 3, 0);
          break;
        case 'last_30_days':
          startDate = new Date(today.setDate(today.getDate() - 30));
          endDate = new Date();
          break;
        case 'next_30_days':
          startDate = new Date();
          endDate = new Date(today.setDate(today.getDate() + 30));
          break;
        default:
          // No date filter
          break;
      }
      
      if (startDate && endDate) {
        initiativesQuery = initiativesQuery
          .gte('due_date', startDate.toISOString())
          .lte('due_date', endDate.toISOString());
      }
    }
    
    // Execute query
    const { data: initiatives, error } = await initiativesQuery
      .order('progress', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    // Process and format the data
    const formattedInitiatives = initiatives.map(init => {
      const totalActivities = init.activities ? init.activities.length : 0;
      const completedActivities = init.activities 
        ? init.activities.filter(a => a.is_completed).length 
        : 0;
      
      const objectives = init.objective_initiatives 
        ? init.objective_initiatives.map(oi => oi.objectives).filter(Boolean)
        : [];
      
      return {
        id: init.id,
        name: init.title,
        status: init.status || 'in_progress',
        progress: init.progress || 0,
        area: init.areas?.name || 'Sin área',
        metrics: {
          completion: init.progress || 0,
          activities_completed: completedActivities,
          activities_total: totalActivities,
          activities_completion_rate: totalActivities > 0 
            ? Math.round((completedActivities / totalActivities) * 100)
            : 0
        },
        objectives: objectives.map(obj => ({
          title: obj.title,
          progress: obj.progress
        })),
        due_date: init.due_date,
        start_date: init.start_date
      };
    });
    
    // Calculate summary statistics
    const stats = {
      total_initiatives: formattedInitiatives.length,
      average_progress: formattedInitiatives.length > 0
        ? Math.round(formattedInitiatives.reduce((acc, i) => acc + i.progress, 0) / formattedInitiatives.length)
        : 0,
      by_status: {
        planning: formattedInitiatives.filter(i => i.status === 'planning').length,
        in_progress: formattedInitiatives.filter(i => i.status === 'in_progress').length,
        completed: formattedInitiatives.filter(i => i.status === 'completed').length,
        on_hold: formattedInitiatives.filter(i => i.status === 'on_hold').length
      }
    };
    
    // Format response for Dialogflow
    let responseText = `📊 Found ${stats.total_initiatives} initiatives:\n\n`;
    
    // Add top initiatives
    formattedInitiatives.slice(0, 5).forEach((init, index) => {
      responseText += `${index + 1}. **${init.name}**\n`;
      responseText += `   • Progress: ${init.progress}% | Status: ${init.status}\n`;
      responseText += `   • Area: ${init.area}\n`;
      responseText += `   • Activities: ${init.metrics.activities_completed}/${init.metrics.activities_total}\n`;
      if (init.objectives.length > 0) {
        responseText += `   • Objective: ${init.objectives[0].title}\n`;
      }
      responseText += '\n';
    });
    
    // Add summary statistics
    responseText += `📈 **Summary:**\n`;
    responseText += `• Average Progress: ${stats.average_progress}%\n`;
    responseText += `• Status Distribution: `;
    responseText += `Planning (${stats.by_status.planning}), `;
    responseText += `In Progress (${stats.by_status.in_progress}), `;
    responseText += `Completed (${stats.by_status.completed}), `;
    responseText += `On Hold (${stats.by_status.on_hold})\n`;
    
    // Return success response
    const response = {
      success: true,
      data: formattedInitiatives,
      statistics: stats,
      message: responseText
    };
    
    console.log('Sending response:', JSON.stringify(response).substring(0, 500));
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return error response
    const errorResponse = {
      success: false,
      data: [],
      message: 'Sorry, I encountered an error retrieving the initiative data. Please try again.',
      error: error.message
    };
    
    res.status(200).json(errorResponse); // Return 200 even for errors so Dialogflow can handle it
  }
});