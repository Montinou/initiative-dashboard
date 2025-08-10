import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Initialize Google Gemini model with explicit API key
const model = google('gemini-2.5-flash-lite', {
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

// Deprecated: Internal Stratix chat endpoint has been removed in favor of Dialogflow CX.
// Returning 410 Gone to signal clients to migrate.

export async function POST() {
  return Response.json(
    {
      error: 'deprecated',
      message:
        'The internal Stratix chat endpoint has been removed. Please use the Dialogflow CX agent/widget for AI chat.',
    },
    { status: 410 }
  )
}

export async function GET() {
  return Response.json(
    {
      error: 'deprecated',
      message:
        'The internal Stratix chat endpoint has been removed. Please use the Dialogflow CX agent/widget for AI chat.',
    },
    { status: 410 }
  )
}