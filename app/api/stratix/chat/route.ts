import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Initialize Google Gemini model with explicit API key
const model = google('gemini-2.0-flash-exp', {
  apiKey: process.env.GOOGLE_API_KEY
});

// Define tools for database queries
const queryDatabaseTool = tool({
  description: 'Query the database for specific information about initiatives, objectives, or activities',
  parameters: z.object({
    queryType: z.enum(['initiatives', 'objectives', 'activities', 'areas', 'progress']),
    filters: z.object({
      area_id: z.string().optional(),
      initiative_id: z.string().optional(),
      objective_id: z.string().optional(),
      status: z.string().optional(),
    }).optional(),
  }),
  execute: async ({ queryType, filters }) => {
    // This will be executed server-side with proper access control
    return { queryType, filters };
  },
});

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const supabase = await createClient();

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Authentication required', { status: 401 });
    }

    // Get user profile with full details including organization info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        areas (
          id,
          name,
          objectives_count,
          initiatives_count,
          status
        ),
        tenants (
          id,
          name,
          slug,
          organizations (
            name,
            sector,
            headquarters
          )
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response('User profile not found', { status: 404 });
    }

    // Parse the request body
    const { messages } = await request.json();

    // Analyze the last message for data queries
    const lastMessage = messages[messages.length - 1]?.content || '';
    const needsDataQuery = /datos|data|métricas|metrics|iniciativas|initiatives|objetivos|objectives|actividades|activities|progreso|progress|estadísticas|statistics|análisis|analysis|reporte|report|estado|status|desempeño|performance/i.test(lastMessage);

    // Prepare data context based on user role
    let dataContext = '';
    let availableData: any = {};

    if (needsDataQuery) {
      // Determine data access based on role
      const isExecutive = profile.role === 'CEO' || profile.role === 'Admin';
      const isManager = profile.role === 'Manager';

      // Query initiatives based on role
      if (isExecutive) {
        // Executives can see all data across the organization
        const [initiativesResult, objectivesResult, areasResult] = await Promise.all([
          supabase
            .from('manager_initiative_summary')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('objectives')
            .select(`
              *,
              objective_initiatives (
                initiatives (
                  id,
                  name,
                  status,
                  progress
                )
              )
            `)
            .limit(15),
          supabase
            .from('areas')
            .select(`
              *,
              initiatives (count),
              objectives (count)
            `)
        ]);

        availableData = {
          initiatives: initiativesResult.data || [],
          objectives: objectivesResult.data || [],
          areas: areasResult.data || [],
          accessLevel: 'executive',
          totalInitiatives: initiativesResult.data?.length || 0,
          totalObjectives: objectivesResult.data?.length || 0,
        };

        // Get performance metrics
        const { data: performanceData } = await supabase
          .from('initiatives')
          .select('status, progress')
          .eq('tenant_id', profile.tenant_id);

        if (performanceData) {
          const avgProgress = performanceData.reduce((acc, curr) => acc + (curr.progress || 0), 0) / (performanceData.length || 1);
          const statusCounts = performanceData.reduce((acc: any, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
          }, {});
          
          availableData.metrics = {
            averageProgress: Math.round(avgProgress),
            statusDistribution: statusCounts,
            totalItems: performanceData.length
          };
        }

      } else if (isManager && profile.area_id) {
        // Managers can only see their area's data
        const [initiativesResult, objectivesResult, activitiesResult] = await Promise.all([
          supabase
            .from('manager_initiative_summary')
            .select('*')
            .eq('area_id', profile.area_id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('objectives')
            .select(`
              *,
              objective_initiatives (
                initiatives (
                  id,
                  name,
                  status,
                  progress
                )
              )
            `)
            .eq('area_id', profile.area_id)
            .limit(10),
          supabase
            .from('manager_activity_details')
            .select('*')
            .eq('area_id', profile.area_id)
            .order('due_date', { ascending: true })
            .limit(15)
        ]);

        availableData = {
          initiatives: initiativesResult.data || [],
          objectives: objectivesResult.data || [],
          activities: activitiesResult.data || [],
          accessLevel: 'area_manager',
          areaName: profile.areas?.name,
          areaId: profile.area_id,
        };

        // Get area-specific metrics
        if (initiativesResult.data && initiativesResult.data.length > 0) {
          const avgProgress = initiativesResult.data.reduce((acc, curr) => acc + (curr.progress || 0), 0) / initiativesResult.data.length;
          availableData.metrics = {
            areaAverageProgress: Math.round(avgProgress),
            totalAreaInitiatives: initiativesResult.data.length,
            totalAreaObjectives: objectivesResult.data?.length || 0,
            totalAreaActivities: activitiesResult.data?.length || 0,
          };
        }
      }

      // Format data context for AI
      if (Object.keys(availableData).length > 0) {
        dataContext = `

## Available Organizational Data

${JSON.stringify(availableData, null, 2)}

### Data Access Context
- User Role: ${profile.role}
- Access Level: ${availableData.accessLevel || 'restricted'}
${profile.areas ? `- Area: ${profile.areas.name}` : ''}
- Organization: ${profile.tenants?.organizations?.name || profile.tenants?.name || 'Unknown'}

Use this data to provide accurate, specific answers about the organization's initiatives, objectives, and performance metrics. When discussing specific items, reference them by name and provide relevant details like progress percentages, status, and dates.`;
      }
    }

    // Build comprehensive system prompt
    const systemPrompt = `You are an advanced AI assistant for the Initiative Dashboard system, specialized in organizational performance management and OKR analysis.

## User Profile
- **Name**: ${profile.full_name}
- **Role**: ${profile.role}
- **Email**: ${profile.email}
- **Organization**: ${profile.tenants?.organizations?.name || profile.tenants?.name || 'Unknown'}
${profile.tenants?.organizations?.sector ? `- **Sector**: ${profile.tenants.organizations.sector}` : ''}
${profile.tenants?.organizations?.headquarters ? `- **Headquarters**: ${profile.tenants.organizations.headquarters}` : ''}
${profile.areas ? `- **Department**: ${profile.areas.name} (${profile.areas.initiatives_count || 0} initiatives, ${profile.areas.objectives_count || 0} objectives)` : ''}
- **Tenant**: ${profile.tenants?.slug || profile.tenant_id}

## System Architecture
The Initiative Dashboard is an enterprise-grade multi-tenant OKR (Objectives and Key Results) management platform with the following structure:

### Hierarchical Organization
1. **Organizations** contain multiple Tenants
2. **Tenants** represent business units or divisions
3. **Areas** represent departments or functional teams
4. **Objectives** define strategic goals (linked to Areas)
5. **Initiatives** are tactical projects to achieve objectives (can link to multiple objectives)
6. **Activities** are specific tasks within initiatives

### Role-Based Access Control
- **CEO**: Full system access, cross-organizational visibility, strategic oversight
- **Admin**: Tenant-wide management, configuration, and reporting capabilities
- **Manager**: Area-specific access, operational management, team oversight

## Your Capabilities
1. **Data Analysis**: Analyze organizational performance metrics, progress tracking, and KPIs
2. **Strategic Insights**: Provide recommendations based on OKR best practices
3. **Progress Monitoring**: Track initiative and objective completion rates
4. **Trend Analysis**: Identify patterns in organizational performance
5. **Resource Optimization**: Suggest improvements for better resource allocation
6. **Risk Assessment**: Highlight potential bottlenecks or at-risk initiatives

## Communication Guidelines
- Be professional, concise, and action-oriented
- Use data to support your insights
- Provide specific, measurable recommendations
- Reference actual initiatives and objectives by name when available
- Respect role-based data access restrictions
- Format responses with clear structure (headings, bullets, metrics)
- Include relevant percentages, dates, and quantitative measures
- Suggest next steps or actionable items when appropriate

## Response Format
When providing analysis:
1. Start with a brief executive summary
2. Present key metrics and findings
3. Highlight critical issues or successes
4. Provide actionable recommendations
5. Suggest follow-up questions or areas to explore

Remember: You are a strategic advisor helping drive organizational success through data-driven insights.`;

    // Use streamText with tools for enhanced capabilities
    const result = streamText({
      model,
      system: systemPrompt + dataContext,
      messages,
      tools: {
        queryDatabase: queryDatabaseTool,
      },
      maxTokens: 2000,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Detailed error logging for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      return new Response(
        JSON.stringify({ 
          error: error.message,
          type: 'internal_error',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        type: 'unknown_error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}