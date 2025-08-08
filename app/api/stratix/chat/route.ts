import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Initialize Google Gemini model
const model = google('gemini-2.0-flash-exp');

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const supabase = await createClient();

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Authentication required', { status: 401 });
    }

    // Get user profile with full details
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        areas (
          id,
          name,
          objectives_count,
          initiatives_count
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response('User profile not found', { status: 404 });
    }

    // Parse the request body
    const { messages } = await request.json();

    // Build system prompt with user context
    const systemPrompt = `
You are an AI assistant for the Initiative Dashboard system. You have access to comprehensive information about objectives, initiatives, and activities for the organization.

User Context:
- Name: ${profile.full_name}
- Role: ${profile.role}
- Email: ${profile.email}
- Tenant: ${profile.tenant_id}
${profile.areas ? `- Area: ${profile.areas.name} (${profile.areas.initiatives_count} initiatives, ${profile.areas.objectives_count} objectives)` : ''}

System Context:
The Initiative Dashboard is a multi-tenant OKR (Objectives and Key Results) management system. It helps organizations track their strategic objectives and initiatives through a hierarchical structure:
- Areas contain Objectives and Initiatives
- Initiatives can be linked to multiple Objectives
- Each Initiative has Activities that track progress
- The system supports three roles: CEO (full access), Admin (management), and Manager (area-specific)

You are helpful, professional, and focused on providing insights about the organization's objectives and initiatives. When the user asks for data analysis or specific metrics, you will need to query the database to provide accurate information.

Current capabilities:
- Answering questions about the OKR system
- Providing guidance on how to use the dashboard
- Explaining organizational structure and relationships
- Offering strategic insights based on available data

Please be concise and professional in your responses.`;

    // Check if the user is asking for data analysis
    const lastMessage = messages[messages.length - 1]?.content || '';
    const needsDataQuery = /datos|data|metricas|metrics|iniciativas|initiatives|objetivos|objectives|actividades|activities|progreso|progress|estadisticas|statistics/i.test(lastMessage);

    let dataContext = '';
    
    if (needsDataQuery) {
      // Fetch relevant data based on user role
      if (profile.role === 'CEO' || profile.role === 'Admin') {
        // CEO and Admin can see all data
        const { data: summaryData } = await supabase
          .from('manager_initiative_summary')
          .select('*')
          .limit(10);
        
        if (summaryData && summaryData.length > 0) {
          dataContext = `\n\nAvailable Data Summary:\n${JSON.stringify(summaryData, null, 2)}`;
        }
      } else if (profile.role === 'Manager' && profile.area_id) {
        // Managers can only see their area's data
        const { data: areaData } = await supabase
          .from('manager_initiative_summary')
          .select('*')
          .eq('area_id', profile.area_id)
          .limit(10);
        
        if (areaData && areaData.length > 0) {
          dataContext = `\n\nYour Area's Data:\n${JSON.stringify(areaData, null, 2)}`;
        }
      }
    }

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt + dataContext,
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Internal server error', { status: 500 });
  }
}