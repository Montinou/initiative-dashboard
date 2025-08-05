import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const STRATIX_API_URL = process.env.NEXT_PUBLIC_STRATIX_API_URL || 'https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const supabase = await createClient();

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile to get tenant_id for security
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.tool || !body.tool_parameters) {
      return NextResponse.json({ 
        error: 'Invalid request format. Missing tool or tool_parameters.' 
      }, { status: 400 });
    }

    // Ensure user_id matches the authenticated user
    if (body.tool_parameters.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'User ID mismatch' 
      }, { status: 403 });
    }

    // Get session token for the Cloud Function
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No valid session token' }, { status: 401 });
    }

    console.log('🔗 Proxying request to Stratix Cloud Function:', STRATIX_API_URL);
    console.log('📤 Tool request:', JSON.stringify(body, null, 2));

    // Make request to Google Cloud Function with proper headers
    const response = await fetch(STRATIX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-User-ID': user.id,
        'X-Tenant-ID': profile.tenant_id,
        'X-User-Role': profile.role,
        'X-API-Key': process.env.GOOGLE_AI_API_KEY || '',
        // Add origin header for the Cloud Function
        'Origin': request.headers.get('origin') || 'https://siga-turismo.vercel.app'
      },
      body: JSON.stringify(body)
    });

    // Handle response from Cloud Function
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloud Function error:', response.status, errorText);
      
      return NextResponse.json({ 
        error: `Cloud Function error: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('📥 Received Cloud Function response:', JSON.stringify(data, null, 2));
    
    // Validate response format
    if (!data.tool_output || !Array.isArray(data.tool_output) || data.tool_output.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid response format from Stratix service' 
      }, { status: 502 });
    }

    // Check for errors in the tool response
    const output = data.tool_output[0]?.output;
    if (output?.error) {
      return NextResponse.json({ 
        error: `Stratix service error: ${output.error}` 
      }, { status: 502 });
    }

    // Return successful response
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Stratix proxy error:', error);
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('fetch')) {
        return NextResponse.json({ 
          error: 'Failed to connect to Stratix service',
          details: 'The AI service is temporarily unavailable. Please try again later.'
        }, { status: 503 });
      }
      
      return NextResponse.json({ 
        error: 'Internal server error',
        details: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Unknown error occurred' 
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}