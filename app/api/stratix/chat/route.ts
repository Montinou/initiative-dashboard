import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';

// Initialize Google Gemini model
const model = google('gemini-2.0-flash-exp', {
  apiKey: process.env.GOOGLE_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Configuration error',
          message: 'AI service not configured'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    let messages;
    try {
      const body = await request.json();
      messages = body.messages;
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Invalid messages format');
      }
    } catch (parseError) {
      console.error('Request parsing error:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: 'Messages must be an array'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('Auth failed:', authError?.message || 'No user session');
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Please log in to use the AI assistant'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, areas(*), tenants(*)')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      // Continue without profile - basic functionality
    }

    // Build system prompt
    const systemPrompt = `You are an AI assistant for the Initiative Dashboard OKR management system.

${profile ? `
## User Context
- Name: ${profile.full_name || 'User'}
- Role: ${profile.role || 'Member'}
- Email: ${profile.email}
${profile.areas ? `- Area: ${profile.areas.name}` : ''}
${profile.tenants ? `- Organization: ${profile.tenants.name}` : ''}
` : `
## User Context
- Authenticated user with limited profile information
`}

## Capabilities
- Answer questions about OKRs, initiatives, and objectives
- Provide strategic insights and recommendations
- Help with progress tracking and performance analysis
- Offer best practices for goal management

Be helpful, professional, and concise in your responses.`;

    // Stream response
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return detailed error for debugging
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        message: 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}