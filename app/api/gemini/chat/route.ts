import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get the message from the request
    const { message, context, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if we're in production and need explicit credentials
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In production (Vercel), we need explicit credentials
    // In development, we can use Application Default Credentials
    if (isProduction && (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY)) {
      console.error('Google Vertex AI credentials not configured for production');
      return NextResponse.json({ 
        error: 'AI Assistant is not configured. Please contact support.' 
      }, { status: 503 });
    }

    // Build the conversation for the prompt
    let conversationHistory = '';
    if (history && history.length > 0) {
      conversationHistory = history.map((msg: any) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n');
    }

    // Build the system prompt with context
    let systemPrompt = 'You are an AI assistant helping with OKR (Objectives and Key Results) management, initiatives tracking, and performance analysis.';
    
    if (context) {
      systemPrompt += `\n\nHere is the current context about the system and data:\n${JSON.stringify(context, null, 2)}\n\nUse this information to provide accurate and helpful responses about the user's objectives, initiatives, and performance metrics.`;
    }

    // Build the full prompt
    let fullPrompt = systemPrompt;
    
    if (conversationHistory) {
      fullPrompt += `\n\nPrevious conversation:\n${conversationHistory}`;
    }
    
    fullPrompt += `\n\nUser: ${message}\n\nAssistant:`;

    // Configure the model based on environment
    let model;
    
    if (!isProduction) {
      // Development: Use Node.js version with Application Default Credentials
      const { vertex } = await import('@ai-sdk/google-vertex');
      model = vertex('gemini-1.5-flash', {
        projectId: process.env.GCP_PROJECT_ID || 'insaight-backend',
        location: 'us-central1',
      });
    } else {
      // Production: Use Edge-compatible version with explicit credentials
      const { vertex } = await import('@ai-sdk/google-vertex/edge');
      model = vertex('gemini-1.5-flash', {
        projectId: process.env.GCP_PROJECT_ID || 'insaight-backend',
        location: 'us-central1',
      });
    }

    // Generate response using Vercel AI SDK with Vertex AI
    const { text } = await generateText({
      model,
      prompt: fullPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Log the interaction for audit purposes (optional)
    console.log(`[Gemini Chat] User ${profile.email}: ${message.substring(0, 50)}...`);

    return NextResponse.json({
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in Vertex AI chat:', error);
    
    // Handle specific Vertex AI errors
    if (error.message?.includes('credentials')) {
      return NextResponse.json({ 
        error: 'Invalid Vertex AI credentials configuration' 
      }, { status: 503 });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return NextResponse.json({ 
        error: 'API quota exceeded. Please try again later.' 
      }, { status: 429 });
    }

    if (error.message?.includes('model')) {
      return NextResponse.json({ 
        error: 'Model not available. Please try again later.' 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}