import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, Message, streamText } from 'ai';
import { NextResponse } from 'next/server';

// Asegúrate de que las variables de entorno están definidas
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_API_KEY no está definido en el entorno.');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Extrae el historial de chat de la petición
  const { messages } = await req.json();

  // Mapea el historial de mensajes al formato de Gemini
  // El Vercel AI SDK y la API de Gemini tienen formatos ligeramente diferentes
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const result = await streamText({
    model,
    messages: messages,
    // Puedes pasar configuraciones adicionales aquí
    // Por ejemplo:
    // temperature: 0.7,
    // topP: 1,
    // topK: 1
  });

  return result.to
}
