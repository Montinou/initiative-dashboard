import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';

// Initialize Google Gemini model with API key
const model = google('gemini-2.0-flash-exp', {
  apiKey: process.env.GOOGLE_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { messages } = await request.json();

    // Build system prompt for testing
    const systemPrompt = `
You are an AI assistant for the Initiative Dashboard system. You have access to comprehensive information about objectives, initiatives, and activities for the organization.

Test Mode Context:
- This is a TEST instance for demonstrating the Gemini AI integration
- You are helping test the chat functionality
- User is testing without authentication

System Context:
The Initiative Dashboard is a multi-tenant OKR (Objectives and Key Results) management system. It helps organizations track their strategic objectives and initiatives through a hierarchical structure:
- Areas contain Objectives and Initiatives
- Initiatives can be linked to multiple Objectives
- Each Initiative has Activities that track progress
- The system supports three roles: CEO (full access), Admin (management), and Manager (area-specific)

You are helpful, professional, and focused on providing insights about the organization's objectives and initiatives.

Please be concise and professional in your responses.`;

    // Use streamText from Vercel AI SDK
    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    });

    // Return the text stream response
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Test Chat API error:', error);
    
    // Return error details for debugging
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ 
          error: error.message,
          stack: error.stack,
          name: error.name 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Internal server error', { status: 500 });
  }
}