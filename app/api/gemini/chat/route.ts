import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

// Initialize Gemini AI on the server side with the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

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

    // Check if API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.error('GOOGLE_AI_API_KEY not configured on server');
      return NextResponse.json({ 
        error: 'Gemini AI is not configured. Please contact support.' 
      }, { status: 503 });
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Build the conversation history
    const chatHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system context if provided
    if (context && chatHistory.length === 0) {
      chatHistory.unshift({
        role: 'user',
        parts: [{ 
          text: `Context about the system and current data:\n${JSON.stringify(context, null, 2)}\n\nPlease use this context to help answer questions about the OKR system.` 
        }]
      }, {
        role: 'model',
        parts: [{ 
          text: 'I understand the context. I\'m ready to help you with your OKR system, initiatives, and performance tracking based on the provided data.' 
        }]
      });
    }

    // Start or continue the chat
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Send the message and get response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Log the interaction for audit purposes (optional)
    console.log(`[Gemini Chat] User ${profile.email}: ${message.substring(0, 50)}...`);

    return NextResponse.json({
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in Gemini chat:', error);
    
    // Handle specific Google AI errors
    if (error.message?.includes('API key not valid')) {
      return NextResponse.json({ 
        error: 'Invalid API key configuration' 
      }, { status: 503 });
    }
    
    if (error.message?.includes('quota')) {
      return NextResponse.json({ 
        error: 'API quota exceeded. Please try again later.' 
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: 'Failed to process chat message' 
    }, { status: 500 });
  }
}